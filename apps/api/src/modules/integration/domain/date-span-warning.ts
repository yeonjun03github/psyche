/**
 * PHQ-9/GAD-7/WHO-5는 "지난 2주", PSS-10은 "지난 한 달"처럼 각 검사가 각기 다른 기준
 * 기간을 묻는다. 검사들을 완료한 시점이 서로 너무 떨어져 있으면, 하나의 시점을 나타내야 할
 * 통합 리포트가 사실은 서로 다른 시기의 상태를 섞어 버리게 되어 부정확해질 수 있다.
 */
export interface DateSpanWarning {
  spanDays: number;
  thresholdDays: number;
  requiresConfirmation: boolean;
}

export function computeDateSpanWarning(completedAts: Date[], thresholdDays: number): DateSpanWarning {
  if (completedAts.length < 2) {
    return { spanDays: 0, thresholdDays, requiresConfirmation: false };
  }
  const times = completedAts.map((d) => d.getTime());
  const spanDays = Math.round((Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60 * 24));
  return { spanDays, thresholdDays, requiresConfirmation: spanDays > thresholdDays };
}
