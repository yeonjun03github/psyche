import { BadRequestException } from '@nestjs/common';
import { aes } from '../../../prisma/seed/data/aes';
import { als18 } from '../../../prisma/seed/data/als18';
import { shaps } from '../../../prisma/seed/data/shaps';
import { SessionsService } from './sessions.service';

const USER_ID = 'user-1';

function questionCountOf(definition: unknown): number {
  return (definition as { questions: unknown[] }).questions.length;
}

interface SeedDefinition {
  code: string;
  questions: { questionId: string; options: { value: number }[] }[];
}

type StoredSession = {
  id: string;
  userId: string;
  testCode: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  answers: { questionId: string; value: number; answeredAt: Date }[];
  riskTriggered: boolean;
};

/** DB·인증은 가짜로 두고, 실제 시드 정의와 실제 채점기로 세션 서비스의 저장·제출 흐름을 검증한다. */
function setup(definition: unknown, answeredCount: number, value = 2) {
  const def = definition as SeedDefinition & Record<string, unknown>;
  const session: StoredSession = {
    id: 'session-1',
    userId: USER_ID,
    testCode: def.code,
    status: 'IN_PROGRESS',
    answers: def.questions
      .slice(0, answeredCount)
      .map((q) => ({ questionId: q.questionId, value, answeredAt: new Date() })),
    riskTriggered: false,
  };

  const update = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...session, ...data }));
  const prisma = {
    testSession: {
      findUnique: jest.fn(async () => session),
      update,
    },
  };
  const currentUser = { getUserId: jest.fn(async () => USER_ID) };
  const testDefinitions = {
    findByCode: jest.fn(async () => ({ ...def, scoringConfig: { riskFlags: [], ...(def.scoringConfig as object) } })),
  };

  const service = new SessionsService(prisma as never, currentUser as never, testDefinitions as never);
  return { service, update, session, def };
}

describe.each([
  ['AES', aes],
  ['ALS18', als18],
  ['SHAPS', shaps],
])('SessionsService — %s', (code, definition) => {
  it('미응답 문항이 있으면 제출할 수 없고 아무것도 저장되지 않는다', async () => {
    const { service, update, def } = setup(definition, questionCountOf(definition) - 1);
    await expect(service.submit('session-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submit('session-1')).rejects.toThrow('아직 응답하지 않은 문항이 1개');
    expect(update).not.toHaveBeenCalled();
    expect(def.code).toBe(code);
  });

  it('아무 문항도 응답하지 않으면 제출할 수 없다', async () => {
    const { service, update } = setup(definition, 0);
    await expect(service.submit('session-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('선택지에 없는 응답값(범위 밖)은 저장되지 않는다', async () => {
    const { service, update, def } = setup(definition, 0);
    const first = def.questions[0].questionId;
    await expect(service.saveAnswer('session-1', { questionId: first, value: 0 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.saveAnswer('session-1', { questionId: first, value: 5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('이 검사의 문항이 아닌 questionId는 저장되지 않는다', async () => {
    const { service, update } = setup(definition, 0);
    await expect(service.saveAnswer('session-1', { questionId: 'q999', value: 2 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('유효한 응답은 저장된다', async () => {
    const { service, update, def } = setup(definition, 0);
    await service.saveAnswer('session-1', { questionId: def.questions[0].questionId, value: 3 });
    expect(update).toHaveBeenCalledTimes(1);
    const data = update.mock.calls[0][0].data as { answers: { questionId: string; value: number }[] };
    expect(data.answers).toEqual([expect.objectContaining({ questionId: def.questions[0].questionId, value: 3 })]);
  });

  it('모든 문항에 응답하면 COMPLETED로 정상 저장된다', async () => {
    const { service, update } = setup(definition, questionCountOf(definition));
    const result = await service.submit('session-1');
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBeInstanceOf(Date);
  });
});


describe('SessionsService — 제출 시 저장되는 점수 구조', () => {
  it('AES: 총점이 저장되고 band는 null, 보조 점수는 비어 있다', async () => {
    const { service, update } = setup(aes, (aes as unknown as SeedDefinition).questions.length, 2);
    await service.submit('session-1');
    const data = update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.status).toBe('COMPLETED');
    expect(data.rawScore).toBe(51);
    expect(data.band).toBeNull();
    expect(data.subscaleScores).toEqual([]);
    expect(data.alternateScores).toEqual([]);
  });

  it('ALS-18: 전체 평균과 하위척도 3개가 함께 저장된다', async () => {
    const { service, update } = setup(als18, (als18 as unknown as SeedDefinition).questions.length, 3);
    await service.submit('session-1');
    const data = update.mock.calls[0][0].data as {
      rawScore: number;
      band: string | null;
      subscaleScores: { name: string; rawScore: number; band: string | null }[];
    };
    expect(data.rawScore).toBe(3);
    expect(data.band).toBeNull();
    expect(data.subscaleScores).toHaveLength(3);
    expect(data.subscaleScores.map((s) => s.rawScore)).toEqual([3, 3, 3]);
  });

  it('SHAPS: 차원 점수(rawScore)와 이분 점수(alternateScores)가 모두 저장된다', async () => {
    const { service, update } = setup(shaps, (shaps as unknown as SeedDefinition).questions.length, 2);
    await service.submit('session-1');
    const data = update.mock.calls[0][0].data as {
      rawScore: number;
      band: string | null;
      alternateScores: { key: string; rawScore: number; band: string | null }[];
    };
    expect(data.rawScore).toBe(14 * 3); // 5 - 2 = 3점씩
    expect(data.band).toBeNull();
    expect(data.alternateScores).toEqual([
      { key: 'binary', name: '이분 채점(원판)', rawScore: 14, band: '절단점 이상(3점 이상)' },
    ]);
  });

  it('이미 완료된 세션은 다시 제출할 수 없다', async () => {
    const { service, session, update } = setup(aes, 18, 2);
    session.status = 'COMPLETED';
    await expect(service.submit('session-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });
});
