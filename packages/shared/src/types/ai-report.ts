/**
 * AI 리포트는 검사별 결과를 나열하지 않고, 7종 필수 검사를 하나의 인물상으로 통합 해석한
 * 서사형 리포트다. 각 필드는 특정 검사 하나가 아니라 전체 종합 결론이며, "검사에서 확인되는
 * 사실 → 수검자가 보고한 상황 → 관련 가능성(가설) → 알 수 없는 점" 순서로 사실과 해석을
 * 명확히 분리해 서술한다.
 *
 * confirmedStatus 이후 필드들은 이 구조로 개편되기 전 리포트에는 존재하지 않으므로 전부
 * optional(string | null)이다 — 없으면 UI가 그 섹션을 건너뛴다.
 */
export interface AIReportSections {
  overallSummary: string;
  personalityProfile: string;
  confirmedStatus: string | null;
  confirmedStrength: string | null;
  crossTestPatterns: string | null;
  /** 사용자가 남긴 참고 메모가 없으면 null — AI의 추론을 섞지 않고 보고 내용만 담는다. */
  reportedSituation: string | null;
  /** 참고 메모가 없으면 관련지을 "현재 상황" 자체가 없으므로 null. 반드시 가설 어조로만 작성. */
  possibleRelevance: string | null;
  unknownFromCurrentData: string | null;
  suggestedFollowUps: string | null;
  selfCareDirections: string | null;
  metricsToTrack: string;
  retestGuidance: string | null;
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
  /** 리포트 최상단 배치. Big Five/정신건강 검사/사용자 메모를 종합한 한 줄 별명 + 2~3줄 설명 */
  psychNickname: PsychNickname | null;
  /** "AI가 보는 한 줄" — 리포트 전체에서 가장 중요하게 본 통찰 한 문장(리포트 마지막) */
  keyInsightLine: string | null;
  /** quote-bank.ts 후보의 id만 담는다 — 실제 텍스트는 프론트가 아니라 API가 id로 조회해 채운다.
   *  ReportDto.dailyQuote(계산된 필드)로 노출되며, 프론트는 이 원본 id 필드를 직접 쓰지 않는다. */
  dailyQuoteId: string | null;
}

/** 이모지는 여기 라벨(고정 UI)에만 붙인다 — LLM이 생성하는 본문 서술에는 넣지 않아 임상적 어조를 유지한다. */
export const AI_REPORT_SECTION_LABELS: Record<
  keyof Omit<AIReportSections, 'claimsConfidence' | 'funMbtiGuess' | 'psychNickname' | 'keyInsightLine' | 'dailyQuoteId'>,
  string
> = {
  overallSummary: '📝 전체 요약',
  personalityProfile: '🎨 성격 프로파일',
  confirmedStatus: '🧠 현재 검사에서 확인되는 상태',
  confirmedStrength: '💪 현재 확인되는 강점',
  crossTestPatterns: '🔗 검사 결과에서 함께 나타난 패턴',
  reportedSituation: '🗣️ 수검자가 보고한 현재 상황',
  possibleRelevance: '🔎 현재 상황과 검사 결과의 관련 가능성',
  unknownFromCurrentData: '❓ 현재 자료만으로 알 수 없는 점',
  suggestedFollowUps: '📌 추가로 확인해보면 좋은 부분',
  selfCareDirections: '🎯 현재 결과를 바탕으로 생각해볼 수 있는 자기관리 방향',
  metricsToTrack: '📊 향후 추적하면 좋은 지표',
  retestGuidance: '📅 재검사 안내',
  changesSincePrevious: '📈 이전 리포트 이후 변화',
  improvedAreas: '🌱 개선된 영역',
  worsenedAreas: '📉 악화된 영역',
  unchangedAreas: '➖ 변화가 거의 없는 영역',
  areasToWatch: '👀 앞으로 주의 깊게 볼 영역',
};

/**
 * "확신도(claimsConfidence)"와 사용자 피드백 대상을 이 서브셋으로 제한한다 — 순수 보고
 * (reportedSituation), 한계 고지(unknownFromCurrentData), 절차적/권고성 섹션
 * (suggestedFollowUps, selfCareDirections, metricsToTrack, retestGuidance)은 "얼마나
 * 확신하는가"를 물을 대상이 아니라서 제외한다.
 */
export const CLAIM_SECTION_KEYS = [
  'personalityProfile',
  'confirmedStatus',
  'confirmedStrength',
  'crossTestPatterns',
  'possibleRelevance',
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

/** 리포트 최상단의 "당신의 심리 별명" 보너스 콘텐츠 */
export interface PsychNickname {
  nickname: string;
  explanation: string;
}

/**
 * "오늘 당신을 위한 명언"의 표시용 형태 — API가 dailyQuoteId를 검증된 명언 목록에서 조회해
 * 만든 계산된 값이다(ReportDto.dailyQuote). 텍스트는 항상 quote-bank.ts의 고정 데이터에서만 온다.
 */
export interface DailyQuote {
  quote: string;
  author: string;
}
