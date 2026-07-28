export interface RiskFlagConfig {
  questionId: string;
  triggerValue: number;
  message: string;
}

export interface RiskCheckResult {
  triggered: boolean;
  message: string | null;
}

/**
 * 위기 신호 문항(예: PHQ-9 9번)에 임계값 이상으로 응답했는지 확인한다.
 * 채점(역채점 보정)과 무관하게, 사용자가 실제로 입력한 원래 값 그대로 검사한다 —
 * 안전장치는 "그 문항에 실제로 무엇이라 답했는가"가 기준이지 채점 방향이 아니기 때문이다.
 */
export function checkRisk(riskFlags: RiskFlagConfig[], questionId: string, value: number): RiskCheckResult {
  const matched = riskFlags.find((flag) => flag.questionId === questionId && value >= flag.triggerValue);
  return matched ? { triggered: true, message: matched.message } : { triggered: false, message: null };
}
