import { ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';

function makeReport(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'r1',
    userId: 'u1',
    status: 'COMPLETED',
    failureReason: null,
    aiProvider: 'gemini',
    aiModel: 'gemini-flash-latest',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    completedAt: new Date('2026-01-01T00:00:10Z'),
    ...overrides,
  };
}

describe('AdminService.getReportStats', () => {
  it('ADMIN이 아니면 거부한다', async () => {
    const prisma = { aIReport: { findMany: jest.fn() } };
    const currentUser = { getRole: jest.fn().mockResolvedValue('USER') };
    const service = new AdminService(prisma as never, currentUser as never);

    await expect(service.getReportStats()).rejects.toThrow(ForbiddenException);
    expect(prisma.aIReport.findMany).not.toHaveBeenCalled();
  });

  it('완료된 리포트의 평균/최소/최대 소요시간과 성공률을 계산한다', async () => {
    const reports = [
      makeReport({ id: 'a', createdAt: new Date('2026-01-01T00:00:00Z'), completedAt: new Date('2026-01-01T00:00:10Z') }), // 10s
      makeReport({ id: 'b', createdAt: new Date('2026-01-01T00:00:00Z'), completedAt: new Date('2026-01-01T00:00:30Z') }), // 30s
      makeReport({ id: 'c', status: 'FAILED', completedAt: null, failureReason: '테스트 실패' }),
    ];
    const prisma = { aIReport: { findMany: jest.fn().mockResolvedValue(reports) } };
    const currentUser = { getRole: jest.fn().mockResolvedValue('ADMIN') };
    const service = new AdminService(prisma as never, currentUser as never);

    const stats = await service.getReportStats();

    expect(stats.totalReports).toBe(3);
    expect(stats.averageDurationSeconds).toBe(20);
    expect(stats.minDurationSeconds).toBe(10);
    expect(stats.maxDurationSeconds).toBe(30);
    expect(stats.successRate).toBeCloseTo(2 / 3);
    expect(stats.recentFailures).toHaveLength(1);
    expect(stats.recentFailures[0]).toMatchObject({ id: 'c', failureReason: '테스트 실패' });
  });

  it('모델별로 건수와 평균 소요시간을 묶는다', async () => {
    const reports = [
      makeReport({ id: 'a', aiModel: 'gemini-flash-latest' }),
      makeReport({ id: 'b', aiModel: 'gemini-flash-latest' }),
      makeReport({ id: 'c', aiModel: 'gemini-flash-lite-latest' }),
    ];
    const prisma = { aIReport: { findMany: jest.fn().mockResolvedValue(reports) } };
    const currentUser = { getRole: jest.fn().mockResolvedValue('ADMIN') };
    const service = new AdminService(prisma as never, currentUser as never);

    const stats = await service.getReportStats();

    expect(stats.byModel).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aiModel: 'gemini-flash-latest', count: 2 }),
        expect.objectContaining({ aiModel: 'gemini-flash-lite-latest', count: 1 }),
      ]),
    );
  });

  it('리포트가 없으면 통계 필드가 전부 null/빈 배열이다', async () => {
    const prisma = { aIReport: { findMany: jest.fn().mockResolvedValue([]) } };
    const currentUser = { getRole: jest.fn().mockResolvedValue('ADMIN') };
    const service = new AdminService(prisma as never, currentUser as never);

    const stats = await service.getReportStats();

    expect(stats.totalReports).toBe(0);
    expect(stats.successRate).toBeNull();
    expect(stats.averageDurationSeconds).toBeNull();
    expect(stats.byModel).toEqual([]);
    expect(stats.recentFailures).toEqual([]);
  });
});
