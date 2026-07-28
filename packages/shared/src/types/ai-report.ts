/**
 * AI 리포트는 검사별 결과를 나열하지 않고, 7종 필수 검사를 하나의 인물상으로
 * 통합 해석한 서사형 리포트다. 각 필드는 특정 검사 하나가 아니라 전체 종합 결론이다.
 */
export interface AIReportSections {
  overallSummary: string;
  personalityProfile: string;
  currentMentalHealthStatus: string;
  primaryConcern: string;
  primaryStrength: string;
  crossTestCorrelations: string;
  /** 반드시 "가능성/가설" 어조로만 작성 — 단정적 인과 진술 금지 */
  possibleCausalHypotheses: string;
  maintainingFactors: string;
  aggravatingFactors: string;
  highestLeverageChangeFactor: string;
  priorityIssues: string;
  improvementRoadmap: string;
  metricsToTrack: string;
  recommendedRetestTiming: string;
}

export const AI_REPORT_SECTION_LABELS: Record<keyof AIReportSections, string> = {
  overallSummary: '전체 요약',
  personalityProfile: '성격 프로파일',
  currentMentalHealthStatus: '현재 정신건강 상태',
  primaryConcern: '현재 가장 큰 문제',
  primaryStrength: '현재 가장 큰 강점',
  crossTestCorrelations: '검사 결과 간 연관성',
  possibleCausalHypotheses: '왜 이런 결과가 나왔을 가능성이 있는가',
  maintainingFactors: '현재 상태를 유지시키는 요인',
  aggravatingFactors: '현재 상태를 악화시키는 요인',
  highestLeverageChangeFactor: '개선 가능성이 가장 높은 요소',
  priorityIssues: '우선적으로 해결해야 할 문제',
  improvementRoadmap: '개선 로드맵',
  metricsToTrack: '향후 추적하면 좋은 지표',
  recommendedRetestTiming: '재검사를 추천하는 시점',
};
