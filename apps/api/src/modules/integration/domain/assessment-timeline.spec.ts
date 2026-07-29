import { computeAssessmentTimeline } from './assessment-timeline';

describe('computeAssessmentTimeline', () => {
  it('항목이 1개 이하면 간격을 0으로 반환한다', () => {
    expect(computeAssessmentTimeline([])).toEqual({ entries: [], spanDays: 0, maxGapDays: 0 });

    const single = [{ testCode: 'PHQ9', testName: 'PHQ-9', completedAt: new Date('2026-01-01') }];
    expect(computeAssessmentTimeline(single)).toEqual({ entries: single, spanDays: 0, maxGapDays: 0 });
  });

  it('완료 시점 순으로 정렬하고 전체 기간/최대 간격을 계산한다', () => {
    const result = computeAssessmentTimeline([
      { testCode: 'IPIP50', testName: 'IPIP-50', completedAt: new Date('2026-07-12') },
      { testCode: 'PHQ9', testName: 'PHQ-9', completedAt: new Date('2026-01-01') },
      { testCode: 'WHO5', testName: 'WHO-5', completedAt: new Date('2026-01-03') },
    ]);

    expect(result.entries.map((e) => e.testCode)).toEqual(['PHQ9', 'WHO5', 'IPIP50']);
    expect(result.spanDays).toBe(192);
    // PHQ9→WHO5는 2일, WHO5→IPIP50은 190일 — 최대 간격은 후자
    expect(result.maxGapDays).toBe(190);
  });

  it('반환값에 개선/악화 같은 방향 판정 필드를 절대 포함하지 않는다', () => {
    const result = computeAssessmentTimeline([
      { testCode: 'PHQ9', testName: 'PHQ-9', completedAt: new Date('2026-01-01') },
      { testCode: 'WHO5', testName: 'WHO-5', completedAt: new Date('2026-01-10') },
    ]);
    expect(Object.keys(result)).toEqual(['entries', 'spanDays', 'maxGapDays']);
  });
});
