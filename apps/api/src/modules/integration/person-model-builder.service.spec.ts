import { BadRequestException } from '@nestjs/common';
import { ESSENTIAL_TEST_CODES } from '@psyche/shared';
import { shaps } from '../../../prisma/seed/data/shaps';
import { aes } from '../../../prisma/seed/data/aes';
import { PersonModelBuilderService } from './person-model-builder.service';

const USER_ID = 'user-1';
const OPTIONAL_CODES = ['AES', 'ALS18', 'SHAPS'];

function simpleDefinition(code: string) {
  return {
    code,
    name: `${code} 테스트`,
    category: 'ESSENTIAL',
    responseScaleMin: 0,
    responseScaleMax: 3,
    questions: [{ questionId: 'q1' }, { questionId: 'q2' }],
    scoringConfig: { multiplier: 1, divisor: 1, subscales: [] },
    meta: null,
  };
}

function session(testCode: string, extra: Record<string, unknown> = {}) {
  return {
    id: `sess-${testCode}`,
    userId: USER_ID,
    testCode,
    testDefinitionVersion: 1,
    status: 'COMPLETED',
    completedAt: new Date('2026-10-01T00:00:00Z'),
    rawScore: 3,
    band: '보통',
    subscaleScores: [],
    alternateScores: [],
    ...extra,
  };
}

function setup(options: {
  essentialDone?: readonly string[];
  optionalSessions?: ReturnType<typeof session>[];
  previous?: { id: string; version: number; sourceSessionIds: string[] } | null;
}) {
  const essentialDone = options.essentialDone ?? [...ESSENTIAL_TEST_CODES];
  const sessions = [...essentialDone.map((code) => session(code)), ...(options.optionalSessions ?? [])];

  const definitions: Record<string, unknown> = {
    ...Object.fromEntries(ESSENTIAL_TEST_CODES.map((code) => [code, simpleDefinition(code)])),
    AES: aes,
    SHAPS: shaps,
  };

  const personModelCreate = jest.fn(async ({ data }: { data: unknown }) => data);
  const prisma = {
    testSession: { findMany: jest.fn(async () => sessions) },
    testDefinition: {
      findMany: jest.fn(async (args: { where: { category?: string; code?: { in: string[] } } }) => {
        if (args.where.category === 'OPTIONAL') return OPTIONAL_CODES.map((code) => ({ code }));
        return (args.where.code?.in ?? []).map((code) => definitions[code]).filter(Boolean);
      }),
    },
    personModel: {
      findFirst: jest.fn(async () => options.previous ?? null),
      create: personModelCreate,
    },
  };

  return { service: new PersonModelBuilderService(prisma as never), personModelCreate };
}

describe('PersonModelBuilderService — 선택 검사 통합', () => {
  it('선택 검사를 완료하지 않아도 필수 검사만으로 리포트가 준비된다(선택 검사는 missing이 아니다)', async () => {
    const { service } = setup({});
    const preview = await service.preview(USER_ID);
    expect(preview.ready).toBe(true);
    expect(preview.missingTestCodes).toEqual([]);
    expect(preview.items.map((i) => i.testCode)).toEqual([...ESSENTIAL_TEST_CODES]);
  });

  it('완료한 선택 검사는 미리보기와 PersonModel 입력에 함께 포함된다', async () => {
    const { service, personModelCreate } = setup({
      optionalSessions: [session('AES', { rawScore: 51, band: null })],
    });

    const preview = await service.preview(USER_ID);
    expect(preview.items.map((i) => i.testCode)).toContain('AES');
    expect(preview.items.find((i) => i.testCode === 'AES')).toMatchObject({ rawScore: 51, band: null });

    await service.build(USER_ID);
    const data = personModelCreate.mock.calls[0][0].data as {
      sourceSessionIds: string[];
      testResults: { testCode: string; rawScore: number | null; normalizedScore: number | null; band: string | null }[];
      metadata: { completedEssentialCount: number; totalEssentialCount: number };
    };
    expect(data.sourceSessionIds).toContain('sess-AES');
    const aesResult = data.testResults.find((t) => t.testCode === 'AES')!;
    // 원점수 51은 범위 18–72 안의 값이고, 정규화(61)·밴드(null)와 별개로 저장된다.
    expect(aesResult).toMatchObject({ rawScore: 51, normalizedScore: 61, band: null });
    // 필수 검사 개수 메타데이터는 선택 검사 때문에 바뀌지 않는다.
    expect(data.metadata).toMatchObject({
      completedEssentialCount: ESSENTIAL_TEST_CODES.length,
      totalEssentialCount: ESSENTIAL_TEST_CODES.length,
    });
  });

  it('SHAPS의 이분 점수(보조 점수)가 PersonModel에 보존된다', async () => {
    const { service, personModelCreate } = setup({
      optionalSessions: [
        session('SHAPS', {
          rawScore: 31,
          band: null,
          alternateScores: [{ key: 'binary', name: '이분 채점(원판)', rawScore: 3, band: '절단점 이상(3점 이상)' }],
        }),
      ],
    });
    await service.build(USER_ID);
    const data = personModelCreate.mock.calls[0][0].data as {
      testResults: { testCode: string; rawScore: number | null; alternateScores: unknown[] }[];
    };
    const result = data.testResults.find((t) => t.testCode === 'SHAPS')!;
    expect(result.rawScore).toBe(31);
    expect(result.alternateScores).toEqual([
      { key: 'binary', name: '이분 채점(원판)', rawScore: 3, band: '절단점 이상(3점 이상)' },
    ]);
  });

  it('필수 검사가 하나라도 없으면 선택 검사를 완료했어도 리포트를 만들 수 없다', async () => {
    const { service } = setup({
      essentialDone: ESSENTIAL_TEST_CODES.slice(1),
      optionalSessions: [session('AES', { rawScore: 51, band: null })],
    });
    const preview = await service.preview(USER_ID);
    expect(preview.ready).toBe(false);
    expect(preview.missingTestCodes).toEqual([ESSENTIAL_TEST_CODES[0]]);
    await expect(service.build(USER_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('선택 검사를 새로 완료하면 이전 세션 조합과 달라져 PersonModel이 새로 만들어진다', async () => {
    const essentialSessionIds = ESSENTIAL_TEST_CODES.map((code) => `sess-${code}`);
    const { service, personModelCreate } = setup({
      optionalSessions: [session('AES', { rawScore: 51, band: null })],
      previous: { id: 'pm-1', version: 1, sourceSessionIds: essentialSessionIds },
    });
    await service.build(USER_ID);
    expect(personModelCreate).toHaveBeenCalledTimes(1);
    const data = personModelCreate.mock.calls[0][0].data as { version: number };
    expect(data.version).toBe(2);
  });

  it('세션 조합이 이전과 같으면 PersonModel을 재사용한다(기존 동작 유지)', async () => {
    const essentialSessionIds = ESSENTIAL_TEST_CODES.map((code) => `sess-${code}`);
    const previous = { id: 'pm-1', version: 1, sourceSessionIds: essentialSessionIds };
    const { service, personModelCreate } = setup({ previous });
    const result = await service.build(USER_ID);
    expect(result).toBe(previous);
    expect(personModelCreate).not.toHaveBeenCalled();
  });
});
