export interface TimelineEntry {
  testCode: string;
  testName: string;
  completedAt: Date;
}

export interface AssessmentTimeline {
  entries: TimelineEntry[]; // completedAt 기준 오름차순 정렬
  spanDays: number; // 최초~최후 완료 시점 간격
  maxGapDays: number; // 정렬된 항목 간 최대 연속 간격 — 한 검사만 시기적으로 동떨어져 있는지 드러냄
}

/**
 * date-span-warning.ts는 "생성을 막을지 말지" 게이트 판단용이고, 이 함수는 LLM 프롬프트에
 * 그대로 넣을 재료(검사별 날짜 + 집계)를 만드는 용도라 목적이 달라 별도 파일로 둔다.
 */
export function computeAssessmentTimeline(entries: TimelineEntry[]): AssessmentTimeline {
  const sorted = [...entries].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

  if (sorted.length < 2) {
    return { entries: sorted, spanDays: 0, maxGapDays: 0 };
  }

  const times = sorted.map((e) => e.completedAt.getTime());
  const spanDays = Math.round((times[times.length - 1] - times[0]) / (1000 * 60 * 60 * 24));

  let maxGapDays = 0;
  for (let i = 1; i < times.length; i++) {
    const gapDays = Math.round((times[i] - times[i - 1]) / (1000 * 60 * 60 * 24));
    maxGapDays = Math.max(maxGapDays, gapDays);
  }

  return { entries: sorted, spanDays, maxGapDays };
}
