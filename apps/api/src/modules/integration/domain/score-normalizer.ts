/**
 * 검사(또는 하위척도)가 가질 수 있는 이론적 최소/최대 원점수는 문항 수·응답 스케일·
 * 채점 공식(배수/나눗수)만 알면 항상 유도할 수 있으므로, 검사별로 별도 설정을 두지 않는다.
 */
export function possibleRawScoreRange(
  questionCount: number,
  scaleMin: number,
  scaleMax: number,
  multiplier: number,
  divisor: number,
): { min: number; max: number } {
  return {
    min: (questionCount * scaleMin * multiplier) / divisor,
    max: (questionCount * scaleMax * multiplier) / divisor,
  };
}

/** rawScore를 [min, max] 구간 기준으로 0-100 사이의 정수로 선형 정규화한다. */
export function normalizeToPercent(rawScore: number, min: number, max: number): number {
  if (max === min) return 0;
  const percent = ((rawScore - min) / (max - min)) * 100;
  return Math.round(Math.min(100, Math.max(0, percent)));
}
