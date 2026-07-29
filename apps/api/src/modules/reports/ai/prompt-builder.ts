import { AI_REPORT_SECTION_LABELS, CLAIM_SECTION_KEYS } from '@psyche/shared';
import type { AssessmentTimeline } from '../../integration/domain/assessment-timeline';
import type { PersonModelDiff } from '../../integration/domain/person-model-diff';
import type { FeedbackTally } from '../domain/feedback-summary';

export interface PromptSubscaleResult {
  name: string;
  normalizedScore: number;
  band: string;
}

export interface PromptTestResult {
  testCode: string;
  testName: string;
  normalizedScore: number | null;
  band: string | null;
  subscaleScores: PromptSubscaleResult[];
}

export interface BuildReportPromptInput {
  testResults: PromptTestResult[];
  /** 사용자가 리포트 생성 시 남긴 참고 메모 — 사실이 아니라 참고 정보, 다음 리포트에 재사용 안 함 */
  reportContext?: string;
  /** 검사 완료 시점 정보 — 없으면(검사가 1개 이하면) 프롬프트에서 생략 */
  timeline?: AssessmentTimeline;
  /** 이전 PersonModel과의 순수 수치 비교. null이면 "첫 리포트"라는 뜻으로 LLM에 명시한다. */
  previousComparison?: PersonModelDiff | null;
  /** 과거 리포트들에 대한 사용자 피드백 집계(횟수) — 확정된 사실이 아니라 참고 정보 */
  priorFeedback?: FeedbackTally[];
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * 프롬프트+응답 스키마 계약의 버전. AIReport.promptVersion에 기록해 과거 리포트가 어떤 조건에서
 * 생성됐는지 추적한다(재현성). 프롬프트 텍스트나 섹션 구성이 바뀔 때만 값을 올린다 — 스키마
 * 버전을 따로 두지 않는 이유는 둘이 항상 같이 바뀌기 때문(불필요한 중복 카운터 방지).
 */
export const PROMPT_VERSION = '5';

/** 이 5개는 이전 리포트가 없으면 반드시 null이어야 하는 종단 비교 섹션이다. */
const LONGITUDINAL_SECTION_KEYS = new Set([
  'changesSincePrevious',
  'improvedAreas',
  'worsenedAreas',
  'unchangedAreas',
  'areasToWatch',
]);

/**
 * 라벨만으로는 currentMentalHealthStatus/primaryConcern/possibleCausalHypotheses/
 * maintainingFactors/aggravatingFactors처럼 개념적으로 인접한 섹션들이 서로 무엇을 다뤄서는
 * 안 되는지 구분되지 않아, 같은 근거(스트레스·수면부족·자존감 저하 등)를 섹션마다 반복 서술하는
 * 경향이 있었다. 각 섹션에 "이 섹션만의 질문"과 "다른 섹션과 겹치지 않을 지점"을 명시한다.
 */
const SECTION_GUIDANCE: Record<string, string> = {
  overallSummary: '이 사람을 처음 소개받는 사람에게 건네는 한 문단. 아래 섹션들의 결론만 압축하고, 세부 근거는 반복하지 않는다.',
  personalityProfile:
    '성격 특성을 나열하지 말고, 그 특성이 지금의 심리 상태와 어떻게 상호작용하는지를 설명한다 — 예를 들어 높은 성실성이 지금의 스트레스 상황에서 장점이자 동시에 부담이 되는 지점처럼, 성격과 현재 상태를 반드시 연결한다.',
  currentMentalHealthStatus: '지금 이 순간의 상태에 대한 스냅샷만 다룬다. "왜" 이렇게 됐는지는 여기서 다루지 않는다(그건 possibleCausalHypotheses의 몫).',
  primaryConcern:
    '여러 문제 중 지금 가장 먼저 봐야 할 단 하나를 선택하고 그 이유를 설명한다. currentMentalHealthStatus의 상태 설명을 반복하지 말고, "왜 이것이 다른 것보다 더 시급한가"에만 집중한다.',
  primaryStrength: '약점의 반대가 아니라, 지금 이 사람이 실제로 기댈 수 있는 자원 하나를 짚는다.',
  crossTestCorrelations:
    '겉보기에 무관해 보이는 검사 결과 두 개 이상이 어떻게 맞물리는지 발견하는 섹션. 이미 언급한 개별 결과를 재서술하지 말고, "관계" 자체가 새로운 정보여야 한다.',
  possibleCausalHypotheses:
    '지금 상태가 왜 시작됐을 가능성이 있는지(기원)만 다룬다. maintainingFactors(왜 계속되는지), aggravatingFactors(뭐가 더 나쁘게 만들 수 있는지)와는 다른 시점의 질문임을 명심한다.',
  maintainingFactors: '원인이 무엇이었든, 지금 이 상태를 계속 유지시키는 현재진행형 요인만 다룬다. possibleCausalHypotheses의 원인 설명을 반복하지 않는다.',
  aggravatingFactors:
    '아직 벌어지지 않았거나 더 커질 수 있는 잠재적 위험 요인만 다룬다. 이미 작동 중인 maintainingFactors와 겹치지 않도록, "앞으로 나빠질 수 있는 조건"에 집중한다.',
  highestLeverageChangeFactor: '여러 개선 방향 중 가장 파급력이 큰 단 하나만 짚는다. 구체적이고 오늘 시도해볼 수 있는 수준으로 쓴다 — "스트레스를 관리하세요" 같은 추상적 조언은 피한다.',
  priorityIssues: 'primaryConcern을 포함해 해결 우선순위 목록을 만든다. 각 항목은 한 줄로, 왜 그 순서인지만 짧게 덧붙인다.',
  improvementRoadmap: 'priorityIssues를 실제로 무엇을, 어떤 순서로 실행할지 구체적 행동 계획으로 쓴다. highestLeverageChangeFactor를 어떻게 실천할지 포함한다.',
  metricsToTrack: '검사명을 그대로 반복하지 말고, 일상에서 스스로 체감할 수 있는 구체적 신호로 표현한다.',
  recommendedRetestTiming: '재검사 시점과 그 근거를 한두 문장으로만.',
  changesSincePrevious: '이전 리포트 대비 전체적인 변화의 흐름만 요약한다.',
  improvedAreas: '구체적으로 나아진 부분만 짚는다.',
  worsenedAreas: '구체적으로 나빠진 부분만 짚는다. 없으면 명시적으로 "없다"고 서술한다.',
  unchangedAreas: 'changesSincePrevious에서 이미 말한 흐름을 반복하지 말고, 그중 특별히 변화가 없었던 부분만 짚는다.',
  areasToWatch: 'improvedAreas/worsenedAreas처럼 이미 확정된 변화가 아니라, 아직 확정되지 않았지만 앞으로 지켜봐야 할 신호에 집중한다.',
};

function buildSectionDescriptions(): string {
  return Object.entries(AI_REPORT_SECTION_LABELS)
    .map(([key, label], i) => {
      const nullSuffix = LONGITUDINAL_SECTION_KEYS.has(key) ? ' (이전 리포트가 없으면 null)' : '';
      const guidance = SECTION_GUIDANCE[key] ? ` — ${SECTION_GUIDANCE[key]}` : '';
      return `${i + 1}. ${key} — ${label}${nullSuffix}${guidance}`;
    })
    .join('\n');
}

const SYSTEM_PROMPT = `당신은 여러 심리검사 결과를 근거로 삼아 "한 사람"을 깊이 이해하고 설명하는 심리 전문가입니다.
결과물은 "검사 결과를 잘 요약한 AI"가 아니라 "정말 나를 이해하고 있네"라는 느낌을 주는 임상 피드백처럼
읽혀야 합니다.

가장 중요한 원칙 — 사람이 주인공이고, 검사는 근거일 뿐입니다:
본문에서는 검사명이나 코드(PHQ-9, GAD-7, WHO-5, PSS-10, RSES, IPIP-50, BRS 등)와 점수를 절대
반복해서 언급하지 마십시오. 사람의 상태·성향을 사람의 언어로 먼저 서술하고, 검사명은 오직
claimsConfidence.evidence 필드에서만 사용하십시오.
- 나쁜 예: "PHQ-9에서 우울 점수가 높고, WHO-5에서 웰빙 지수가 낮으며, RSES에서 자존감이 낮게
  나타납니다."
- 좋은 예: "지금은 활력이 많이 떨어져 있고, 스스로를 긍정적으로 바라보기 어려운 상태가 함께
  나타납니다." (근거는 claimsConfidence.evidence에 PHQ-9/WHO-5/RSES로만 기록)
검사 해설서나 논문, 교과서처럼 쓰지 말고, 심리 전문가가 내담자에게 직접 말하듯 쓰십시오.

반드시 지켜야 할 규칙:
1. 의학적 진단, 질병 판정, 치료 권고를 하지 않습니다. 당신은 해석만 합니다.
2. 검사를 하나씩 나열하며 설명하지 마십시오. 단순히 검사 A, 검사 B, 검사 C를 각각 해석하지 말고,
   성격 특성 → 자기 인식 → 정서 상태 → 스트레스 → 현재 행동처럼 여러 요인이 어떻게 연쇄적으로
   맞물려 지금의 한 사람을 만드는지 하나의 흐름으로 서술하십시오. 필수 검사 결과 전체를 근거로
   삼아 "한 사람"에 대한 하나의 통합된 이야기를 쓰십시오.
3. 원인·유지·악화 요인을 다루는 항목(possibleCausalHypotheses, maintainingFactors,
   aggravatingFactors)은 반드시 "~일 가능성이 있습니다", "~라는 가설을 세울 수 있습니다"와 같은
   가설 표현만 사용하고, "때문이다"처럼 단정적인 인과 표현은 사용하지 마십시오. 이 규칙은
   confidence가 HIGH여도 예외 없이 적용됩니다 — confidence는 가설의 "강도"만 바꿉니다(아래 5번).
4. 검사 결과 사이의 상관관계를 스스로 찾아 해석하십시오 — 이 상관관계 분석은 코드가 아니라
   당신이 수행해야 하는 핵심 작업입니다.
5. confidence에 따라 문장의 어조를 다르게 하십시오(단, 위 "사람이 주인공" 원칙은 confidence와
   무관하게 항상 지킵니다 — 검사명을 본문에 노출해도 된다는 뜻이 아닙니다):
   - HIGH: 검사 결과에서 직접 확인 가능한 내용은 "~한 상태가 뚜렷하게 나타납니다", "여러 지표에서
     일관되게 확인됩니다"처럼 명확하게 서술하십시오.
   - MEDIUM: "가능성이 있습니다", "영향을 주었을 수 있습니다"처럼 가설적으로 서술하십시오.
   - LOW: "현재 정보만으로는 확신하기 어렵습니다", "추가 정보가 필요합니다"처럼 추정임을
     명확히 밝히십시오.
   모든 문장을 획일적으로 하나의 어조로 통일하지 마십시오 — confidence가 낮을 때만 조심스럽게,
   높을 때는 명확하게 쓰십시오.
6. 섹션 간 중복을 최소화하십시오. 각 섹션은 아래 "섹션 설명"에 적힌 자신만의 질문에만 답하고,
   다른 섹션이 이미 다룬 사실(스트레스·수면·자존감 같은 키워드 포함)을 다른 표현으로 재진술하지
   마십시오. 같은 근거 사실을 다시 언급해야 한다면 반드시 그 섹션 고유의 새로운 각도(왜/유지/
   악화/개선 등)에서만 언급하고, 최소 하나 이상의 새로운 통찰을 더하십시오. 읽는 사람이 "다음
   섹션을 읽을 이유"가 있어야 합니다.
7. 문장은 짧고 명확하게 쓰십시오. 한 문장에 가설을 3~4개씩 겹쳐 넣지 마십시오. 심리학 전문
   용어보다 사용자가 이해할 수 있는 말로 풀어 쓰되, 전문성은 유지하십시오.
8. 모든 문장은 한국어로, 사용자가 자기 자신을 더 잘 이해하도록 돕는 것을 목표로 작성하십시오.
9. 아래 섹션을 모두, 지정된 스키마의 필드 이름 그대로 채워야 합니다.
10. 사용자가 남긴 참고 메모(사용자 메모)가 주어지면, 이는 검증된 사실이 아니라 참고 정보입니다.
    이를 사실로 단정하지는 말되, 적극적으로 활용하십시오 — 리포트 서두(overallSummary 또는
    currentMentalHealthStatus)에서 그 맥락을 사람의 현실로 먼저 자연스럽게 언급하고, 그다음
    검사 결과가 이를 어떻게 뒷받침하는지 연결해 설명하십시오.
11. 검사 완료 시점 정보가 주어지고 그 간격이 큰 경우, 하나의 동일 시점 심리 상태로 단정하기
    어렵다는 점을 관련 서술(예: currentMentalHealthStatus, overallSummary) 안에서 자연스럽게
    언급하십시오. 억지로 별도 문장을 만들 필요는 없습니다.
12. 이전 리포트 대비 비교 자료(순수 수치)가 주어지면, changesSincePrevious/improvedAreas/
    worsenedAreas/unchangedAreas/areasToWatch 5개 필드를 Person Model 수준에서 통합적으로
    서술하십시오 — 점수를 단순 나열하지 말고, 여러 검사의 변화가 만드는 하나의 이야기로
    종합하십시오. 이 비교 자료가 주어지지 않으면(첫 리포트) 5개 필드는 반드시 null로 반환하십시오.
13. 과거 리포트에 대한 사용자 피드백 집계가 주어지면, 이는 확정된 사실이 아니라 사용자의 과거
    반응 횟수일 뿐입니다. 특정 섹션이 반복적으로 "아니다"로 표시되었다면 그 가설을 맹목적으로
    반복하지 말고 재검토하되, 반복 횟수 자체를 사실처럼 서술하지 마십시오.
14. claimsConfidence 배열에는 다음 섹션들(${CLAIM_SECTION_KEYS.join(', ')})마다 confidence
    (HIGH/MEDIUM/LOW)를 매기십시오. HIGH면 evidence에 근거로 삼은 testCode를 채우고,
    MEDIUM/LOW면 reason에 확신이 낮은 이유(예: "근거 부족", "추가 정보 필요")를 채우십시오.
    당신이 무엇을 직접 관찰했고 무엇을 추론했는지 스스로 구분하는 지표이며, 5번 규칙의 어조와
    반드시 일치해야 합니다(예: HIGH인데 "가능성이 있습니다"로만 서술하는 것은 피하십시오). 본문에
    쓰지 않은 검사명을 여기서는 자유롭게 사용해도 됩니다 — evidence는 사람이 읽는 본문이 아닙니다.
15. funMbtiGuess는 리포트의 핵심 분석이 아니라 마지막에 붙는 재미 보너스입니다(Big Five 등
    심리검사 결과를 MBTI 관점으로 재해석한 참고용 추정 — 실제 MBTI 검사를 수행한 것이 아닙니다).
    - reasoning 첫 문장에서 이것이 실제 검사 결과가 아니라 AI의 참고용 해석임을 분명히 밝히십시오.
    - "당신은 OO입니다"처럼 하나로 단정하지 말고, topCandidates에 서로 다른 유형 3개를
      percentage(합이 대략 100에 가깝게)와 함께 제시하십시오.
    - reasoning에는 어떤 성격 특성(예: 친화성, 성실성, 외향성, 정서적 안정성 등)이 그 후보들과
      가깝다고 판단한 근거인지 간단히 설명하십시오 — 유형만 나열하고 이유를 생략하지 마십시오.
    - confidence는 이 MBTI 추정 자체에 대한 확신 수준입니다. 다른 섹션보다 가볍고 유쾌한 어조를
      써도 되지만, 그래도 진단처럼 단정적으로 쓰지는 마십시오.

절대 하지 말 것: 검사 결과·점수 나열, 검사명 본문 반복, 같은 내용 반복, 논문/교과서 문체,
규칙 기반으로 판정하는 듯한 서술, 의학적 진단, MBTI를 진단처럼 단정하거나 유형 하나로 확정하는 것.

섹션 설명:
${buildSectionDescriptions()}`;

function formatTestResult(result: PromptTestResult): string {
  if (result.subscaleScores.length > 0) {
    const factors = result.subscaleScores
      .map((s) => `    - ${s.name}: 정규화 점수 ${s.normalizedScore}/100 (${s.band})`)
      .join('\n');
    return `- ${result.testName} (${result.testCode})\n${factors}`;
  }
  return `- ${result.testName} (${result.testCode}): 정규화 점수 ${result.normalizedScore}/100 (${result.band})`;
}

function formatTimeline(timeline: AssessmentTimeline): string {
  const lines = timeline.entries.map(
    (e) => `- ${e.testName} (${e.testCode}): ${e.completedAt.toISOString().slice(0, 10)}`,
  );
  return [...lines, `전체 검사 기간: ${timeline.spanDays}일`, `검사 간 최대 간격: ${timeline.maxGapDays}일`].join('\n');
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function formatPreviousComparison(diff: PersonModelDiff): string {
  const lines = diff.testDiffs.map((d) => {
    const scoreLine =
      d.delta !== null
        ? `- ${d.testCode}: 이전 ${d.previousNormalizedScore}/100(${d.previousBand}) → 현재 ${d.currentNormalizedScore}/100(${d.currentBand}), 변화량 ${formatDelta(d.delta)}`
        : `- ${d.testCode}: 이전 리포트에는 없던 검사, 현재 ${d.currentNormalizedScore}/100(${d.currentBand})`;
    const subLines = d.subscaleDiffs.map(
      (s) =>
        `    - ${s.name}: 이전 ${s.previousNormalizedScore} → 현재 ${s.currentNormalizedScore} (변화량 ${formatDelta(s.delta)})`,
    );
    return [scoreLine, ...subLines].join('\n');
  });
  return [`이전 리포트로부터 ${diff.daysSincePrevious}일 경과`, ...lines].join('\n');
}

function formatPriorFeedback(tally: FeedbackTally[]): string {
  return tally
    .map((t) => {
      const label = (AI_REPORT_SECTION_LABELS as Record<string, string>)[t.section] ?? t.section;
      const counts = [
        t.confirmedCount > 0 ? `맞다 ${t.confirmedCount}회` : null,
        t.partiallyConfirmedCount > 0 ? `일부 맞다 ${t.partiallyConfirmedCount}회` : null,
        t.rejectedCount > 0 ? `아니다 ${t.rejectedCount}회` : null,
      ].filter(Boolean);
      const noteSuffix = t.latestNote ? ` (최근 메모: "${t.latestNote}")` : '';
      return `- ${label}: ${counts.join(', ')}${noteSuffix}`;
    })
    .join('\n');
}

export function buildReportPrompt(input: BuildReportPromptInput): BuiltPrompt {
  const body = input.testResults.map(formatTestResult).join('\n');

  const blocks: string[] = [
    `다음은 한 사람이 완료한 필수 심리검사의 표준화된 결과입니다.
원문항 응답이 아니라, 각 검사 자체의 검증된 채점 기준으로 계산된 표준화 점수입니다.

${body}`,
  ];

  if (input.reportContext) {
    blocks.push(`--- 사용자가 남긴 참고 메모(사실 아님) ---\n${input.reportContext}`);
  }
  if (input.timeline) {
    blocks.push(`--- 검사 완료 시점 정보 ---\n${formatTimeline(input.timeline)}`);
  }
  if (input.previousComparison === null) {
    blocks.push('--- 이전 리포트 대비 변화 ---\n이전 PersonModel이 없습니다. 이번이 첫 리포트입니다.');
  } else if (input.previousComparison) {
    blocks.push(`--- 이전 리포트 대비 변화(순수 수치, 해석은 당신의 몫) ---\n${formatPreviousComparison(input.previousComparison)}`);
  }
  if (input.priorFeedback && input.priorFeedback.length > 0) {
    blocks.push(`--- 이전 리포트들에 대한 사용자 반응 집계(참고용, 확정된 사실 아님) ---\n${formatPriorFeedback(input.priorFeedback)}`);
  }

  blocks.push('이 결과들을 하나의 사람으로 통합 해석하여, 지정된 JSON 스키마의 필드를 모두 채워 응답하십시오.');

  return { systemPrompt: SYSTEM_PROMPT, userPrompt: blocks.join('\n\n') };
}
