import { computeDateSpanWarning } from './date-span-warning';

describe('computeDateSpanWarning', () => {
  it('항목이 1개 이하면 경고하지 않는다', () => {
    expect(computeDateSpanWarning([], 30)).toEqual({ spanDays: 0, thresholdDays: 30, requiresConfirmation: false });
    expect(computeDateSpanWarning([new Date('2026-01-01')], 30)).toEqual({
      spanDays: 0,
      thresholdDays: 30,
      requiresConfirmation: false,
    });
  });

  it('임계값 이내 간격이면 확인이 필요 없다', () => {
    const result = computeDateSpanWarning([new Date('2026-01-01'), new Date('2026-01-10')], 30);
    expect(result.spanDays).toBe(9);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('임계값을 초과하면 확인이 필요하다', () => {
    const result = computeDateSpanWarning([new Date('2026-01-01'), new Date('2026-03-01')], 30);
    expect(result.spanDays).toBeGreaterThan(30);
    expect(result.requiresConfirmation).toBe(true);
  });
});
