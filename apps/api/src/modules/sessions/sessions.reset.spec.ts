import { BadRequestException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ESSENTIAL_TEST_CODES } from '@psyche/shared';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

const USER_ID = 'user-1';
const OPTIONAL_CODES = ['AES', 'ALS18', 'SHAPS'];

type Status = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
interface FakeSession {
  id: string;
  userId: string;
  testCode: string;
  status: Status;
}

/** where(userId, testCode in, status) 조건만 해석하는 최소한의 인메모리 가짜 DB. */
function setup(sessions: FakeSession[]) {
  const prisma = {
    testSession: {
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { userId: string; testCode: { in: string[] }; status: Status };
          data: { status: Status };
        }) => {
          const targets = sessions.filter(
            (s) => s.userId === where.userId && where.testCode.in.includes(s.testCode) && s.status === where.status,
          );
          targets.forEach((s) => (s.status = data.status));
          return { count: targets.length };
        },
      ),
      deleteMany: jest.fn(),
    },
    testDefinition: {
      findMany: jest.fn(async () => OPTIONAL_CODES.map((code) => ({ code }))),
    },
    personModel: { deleteMany: jest.fn() },
    aIReport: { deleteMany: jest.fn() },
  };
  const currentUser = { getUserId: jest.fn(async () => USER_ID) };
  const service = new SessionsService(prisma as never, currentUser as never, {} as never);
  return { service, prisma, sessions };
}

const s = (id: string, testCode: string, status: Status, userId = USER_ID): FakeSession => ({ id, userId, testCode, status });
const statusOf = (sessions: FakeSession[], id: string) => sessions.find((x) => x.id === id)!.status;

describe('진행 중인 검사 초기화 — scope 구분', () => {
  const build = () =>
    setup([
      s('e-prog', 'PHQ9', 'IN_PROGRESS'),
      s('e-prog2', 'WHO5', 'IN_PROGRESS'),
      s('e-done', 'GAD7', 'COMPLETED'),
      s('o-prog', 'AES', 'IN_PROGRESS'),
      s('o-prog2', 'SHAPS', 'IN_PROGRESS'),
      s('o-done', 'ALS18', 'COMPLETED'),
      s('other-user', 'PHQ9', 'IN_PROGRESS', 'user-2'),
    ]);

  it('essential: 진행 중인 필수 검사만 취소하고 선택 검사·완료 결과는 건드리지 않는다', async () => {
    const { service, sessions } = build();
    const result = await service.abandonInProgress('essential');
    expect(result).toEqual({ abandonedCount: 2 });
    expect(statusOf(sessions, 'e-prog')).toBe('ABANDONED');
    expect(statusOf(sessions, 'e-prog2')).toBe('ABANDONED');
    expect(statusOf(sessions, 'e-done')).toBe('COMPLETED');
    // 다른 scope(선택 검사)의 진행 중 세션과 완료 결과는 그대로
    expect(statusOf(sessions, 'o-prog')).toBe('IN_PROGRESS');
    expect(statusOf(sessions, 'o-prog2')).toBe('IN_PROGRESS');
    expect(statusOf(sessions, 'o-done')).toBe('COMPLETED');
    // 다른 사용자 세션은 영향 없음
    expect(statusOf(sessions, 'other-user')).toBe('IN_PROGRESS');
  });

  it('optional: 진행 중인 선택 검사만 취소하고 필수 검사·완료된 선택 검사 결과는 유지한다', async () => {
    const { service, sessions } = build();
    const result = await service.abandonInProgress('optional');
    expect(result).toEqual({ abandonedCount: 2 });
    expect(statusOf(sessions, 'o-prog')).toBe('ABANDONED');
    expect(statusOf(sessions, 'o-prog2')).toBe('ABANDONED');
    expect(statusOf(sessions, 'o-done')).toBe('COMPLETED'); // 완료된 선택 검사 결과는 삭제/변경되지 않는다
    expect(statusOf(sessions, 'e-prog')).toBe('IN_PROGRESS');
    expect(statusOf(sessions, 'e-prog2')).toBe('IN_PROGRESS');
    expect(statusOf(sessions, 'e-done')).toBe('COMPLETED');
    expect(statusOf(sessions, 'other-user')).toBe('IN_PROGRESS');
  });

  it('어느 scope든 문서를 삭제하지 않는다(상태만 변경) — 전체 결과 삭제와 분리', async () => {
    const { service, prisma } = build();
    await service.abandonInProgress('essential');
    await service.abandonInProgress('optional');
    expect(prisma.testSession.deleteMany).not.toHaveBeenCalled();
    expect(prisma.personModel.deleteMany).not.toHaveBeenCalled();
    expect(prisma.aIReport.deleteMany).not.toHaveBeenCalled();
  });

  it('진행 중인 검사가 없어도 안전하게 0건으로 끝난다', async () => {
    const { service, sessions } = setup([s('e-done', 'PHQ9', 'COMPLETED'), s('o-done', 'AES', 'COMPLETED')]);
    await expect(service.abandonInProgress('essential')).resolves.toEqual({ abandonedCount: 0 });
    await expect(service.abandonInProgress('optional')).resolves.toEqual({ abandonedCount: 0 });
    expect(sessions.map((x) => x.status)).toEqual(['COMPLETED', 'COMPLETED']);
  });

  it('세션이 아예 없어도 안전하다', async () => {
    const { service } = setup([]);
    await expect(service.abandonInProgress('optional')).resolves.toEqual({ abandonedCount: 0 });
  });

  it('두 번 연속 호출해도(멱등) 두 번째는 0건이다', async () => {
    const { service } = build();
    await service.abandonInProgress('optional');
    await expect(service.abandonInProgress('optional')).resolves.toEqual({ abandonedCount: 0 });
  });

  it('필수 scope는 정확히 필수 7종 코드만, 선택 scope는 DB의 OPTIONAL 정의 코드만 대상으로 한다', async () => {
    const { service, prisma } = build();
    await service.abandonInProgress('essential');
    await service.abandonInProgress('optional');
    const calls = prisma.testSession.updateMany.mock.calls.map((c) => c[0].where.testCode.in);
    expect(calls[0]).toEqual([...ESSENTIAL_TEST_CODES]);
    expect(calls[1]).toEqual(OPTIONAL_CODES);
    expect(calls[0].some((code) => OPTIONAL_CODES.includes(code))).toBe(false);
  });
});

describe('SessionsController — reset scope 검증', () => {
  const makeController = () => {
    const abandonInProgress = jest.fn(async () => ({ abandonedCount: 0 }));
    const controller = new SessionsController({ abandonInProgress } as never);
    return { controller, abandonInProgress };
  };

  it('scope=optional / essential을 서비스에 그대로 전달한다', () => {
    const { controller, abandonInProgress } = makeController();
    controller.resetInProgress('optional');
    controller.resetInProgress('essential');
    expect(abandonInProgress.mock.calls).toEqual([['optional'], ['essential']]);
  });

  it('scope를 생략하면 기존 동작(필수 검사)을 유지한다', () => {
    const { controller, abandonInProgress } = makeController();
    controller.resetInProgress();
    expect(abandonInProgress).toHaveBeenCalledWith('essential');
  });

  it.each(['all', 'ESSENTIAL', '', 'optional,essential'])('허용되지 않는 scope(%j)는 400으로 거부하고 아무것도 취소하지 않는다', (scope) => {
    const { controller, abandonInProgress } = makeController();
    expect(() => controller.resetInProgress(scope)).toThrow(BadRequestException);
    expect(abandonInProgress).not.toHaveBeenCalled();
  });

  it('전체 삭제(reset-all)는 별도 엔드포인트이며 scope를 받지 않는다', () => {
    const resetAll = jest.fn(async () => ({}));
    const controller = new SessionsController({ resetAll } as never);
    controller.resetAll();
    expect(resetAll).toHaveBeenCalledWith();
  });
});

describe('대시보드 문구와 실제 동작의 일치', () => {
  const webDir = join(__dirname, '../../../../web/src/app');
  const button = readFileSync(join(webDir, 'reset-progress-button.tsx'), 'utf8');
  const dashboard = readFileSync(join(webDir, 'page.tsx'), 'utf8');
  const apiClient = readFileSync(join(webDir, '../lib/api.ts'), 'utf8');

  it('버튼 문구가 "필수"/"선택"으로 구분되고 옛 모호한 문구가 남아 있지 않다', () => {
    expect(button).toContain("label: '진행 중인 필수 검사 초기화'");
    expect(button).toContain("label: '진행 중인 선택 검사 초기화'");
    expect(button).not.toContain('진행 중인 검사 초기화');
    expect(button).not.toContain('진행 중인 검사를 모두 취소');
  });

  it('확인 모달이 완료된 결과는 삭제되지 않는다고 안내한다', () => {
    expect(button).toContain('완료된 검사 결과는 삭제되지 않습니다');
  });

  it('필수 섹션 버튼은 essential(기본값), 선택 섹션 버튼은 optional scope를 쓴다', () => {
    expect(dashboard).toContain('<ResetProgressButton disabled={!hasInProgress} />');
    expect(dashboard).toContain('<ResetProgressButton scope="optional" disabled={!hasOptionalInProgress} />');
    expect(button).toContain("scope = 'essential'");
  });

  it('버튼은 선택된 scope를 API 호출에 그대로 전달하고, API 클라이언트는 쿼리의 scope로 보낸다', () => {
    expect(button).toContain('api.resetInProgressSessions(scope)');
    expect(apiClient).toContain('/sessions/reset?scope=${scope}');
  });

  it('전체 결과 삭제 버튼은 scope 기능과 별개의 API(reset-all)를 쓴다', () => {
    expect(apiClient).toContain("'/sessions/reset-all'");
  });
});
