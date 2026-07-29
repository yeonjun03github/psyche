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
  /** 이전 리포트(PersonModel)가 없으면 5개 전부 null */
  changesSincePrevious: string | null;
  improvedAreas: string | null;
  worsenedAreas: string | null;
  unchangedAreas: string | null;
  areasToWatch: string | null;
  claimsConfidence: ClaimConfidence[];
  /** 프로젝트 핵심 분석이 아닌 보너스 이스터에그 — 실제 MBTI 검사가 아니라 AI의 참고용 재해석.
   *  이 필드가 생기기 전에 만들어진 기존 리포트는 null이다. */
  funMbtiGuess: FunMbtiGuess | null;
}

/** 이모지는 여기 라벨(고정 UI)에만 붙인다 — LLM이 생성하는 본문 서술에는 넣지 않아 임상적 어조를 유지한다. */
export const AI_REPORT_SECTION_LABELS: Record<keyof Omit<AIReportSections, 'claimsConfidence' | 'funMbtiGuess'>, string> = {
  overallSummary: '📝 전체 요약',
  personalityProfile: '🎨 성격 프로파일',
  currentMentalHealthStatus: '🧠 현재 정신건강 상태',
  primaryConcern: '⚠️ 현재 가장 큰 문제',
  primaryStrength: '💪 현재 가장 큰 강점',
  crossTestCorrelations: '🔗 검사 결과 간 연관성',
  possibleCausalHypotheses: '🔍 왜 이런 결과가 나왔을 가능성이 있는가',
  maintainingFactors: '🔄 현재 상태를 유지시키는 요인',
  aggravatingFactors: '⚡ 현재 상태를 악화시키는 요인',
  highestLeverageChangeFactor: '🔑 개선 가능성이 가장 높은 요소',
  priorityIssues: '🎯 우선적으로 해결해야 할 문제',
  improvementRoadmap: '🗺️ 개선 로드맵',
  metricsToTrack: '📊 향후 추적하면 좋은 지표',
  recommendedRetestTiming: '📅 재검사를 추천하는 시점',
  changesSincePrevious: '📈 이전 리포트 이후 변화',
  improvedAreas: '🌱 개선된 영역',
  worsenedAreas: '📉 악화된 영역',
  unchangedAreas: '➖ 변화가 거의 없는 영역',
  areasToWatch: '👀 앞으로 주의 깊게 볼 영역',
};

/**
 * "확신도(claimsConfidence)"와 사용자 피드백 대상을 이 서브셋으로 제한한다 — 절차적/권고성
 * 섹션(priorityIssues, improvementRoadmap, metricsToTrack, recommendedRetestTiming)은
 * "얼마나 확신하는가"를 물을 대상이 아니라서 제외한다.
 */
export const CLAIM_SECTION_KEYS = [
  'personalityProfile',
  'currentMentalHealthStatus',
  'primaryConcern',
  'primaryStrength',
  'crossTestCorrelations',
  'possibleCausalHypotheses',
  'maintainingFactors',
  'aggravatingFactors',
  'highestLeverageChangeFactor',
  'changesSincePrevious',
  'improvedAreas',
  'worsenedAreas',
  'unchangedAreas',
  'areasToWatch',
] as const;

export type ClaimSectionKey = (typeof CLAIM_SECTION_KEYS)[number];

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** LLM 자신이 해당 섹션 서술에 대해 갖는 확신도 — evidence는 근거 testCode들, reason은 낮은 확신도의 이유 */
export interface ClaimConfidence {
  section: ClaimSectionKey;
  confidence: ConfidenceLevel;
  evidence: string[];
  reason: string | null;
}

export type FeedbackVerdict = 'CONFIRMED' | 'PARTIALLY_CONFIRMED' | 'REJECTED';

/** 사용자가 특정 섹션(해석적 주장)에 남긴 반응 — 사실이 아니라 참고 정보 */
export interface SectionFeedback {
  section: ClaimSectionKey;
  verdict: FeedbackVerdict;
  note: string | null;
  updatedAt: string;
}

export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

export type MbtiType = (typeof MBTI_TYPES)[number];

export interface MbtiCandidate {
  type: MbtiType;
  percentage: number;
}

/**
 * 재미 보너스 이스터에그. 실제 MBTI 검사를 수행하지 않으며, Big Five(IPIP-50) 등 기존 심리검사
 * 결과를 AI가 MBTI 관점으로 재해석한 참고용 추정일 뿐이다. 하나로 단정하지 않도록 항상
 * top 3 후보를 제시하고, claimsConfidence/CLAIM_SECTION_KEYS와는 별개로 자체 confidence를 갖는다
 * (핵심 해석이 아니므로 사용자 피드백 대상에도 포함하지 않는다).
 */
export interface FunMbtiGuess {
  topCandidates: MbtiCandidate[];
  reasoning: string;
  confidence: ConfidenceLevel;
}
