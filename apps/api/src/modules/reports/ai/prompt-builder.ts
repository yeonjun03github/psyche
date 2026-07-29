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
export const PROMPT_VERSION = '2';

/** 이 5개는 이전 리포트가 없으면 반드시 null이어야 하는 종단 비교 섹션이다. */
const LONGITUDINAL_SECTION_KEYS = new Set([
  'changesSincePrevious',
  'improvedAreas',
  'worsenedAreas',
  'unchangedAreas',
  'areasToWatch',
]);

function buildSectionDescriptions(): string {
  return Object.entries(AI_REPORT_SECTION_LABELS)
    .map(([key, label], i) => {
      const suffix = LONGITUDINAL_SECTION_KEYS.has(key) ? ' (이전 리포트가 없으면 null)' : '';
      return `${i + 1}. ${key} — ${label}${suffix}`;
    })
    .join('\n');
}

const SYSTEM_PROMPT = `당신은 여러 심리검사 결과를 하나로 통합 해석하는 역할을 맡습니다.

반드시 지켜야 할 규칙:
1. 의학적 진단, 질병 판정, 치료 권고를 하지 않습니다. 당신은 해석만 합니다.
2. 검사를 하나씩 나열하며 설명하지 마십시오. 필수 검사 결과 전체를 근거로 삼아 "한 사람"에 대한
   하나의 통합된 이야기를 쓰십시오. 각 섹션은 특정 검사 하나가 아니라 전체 결과의 종합입니다.
3. 원인을 다루는 항목(possibleCausalHypotheses)은 반드시 "~일 가능성이 있습니다",
   "~라는 가설을 세울 수 있습니다"와 같은 표현만 사용하고, "때문이다"처럼 단정적인 인과 표현은
   사용하지 마십시오.
4. 검사 결과 사이의 상관관계를 스스로 찾아 해석하십시오 — 이 상관관계 분석은 코드가 아니라
   당신이 수행해야 하는 핵심 작업입니다.
5. 모든 문장은 한국어로, 사용자가 자기 자신을 더 잘 이해하도록 돕는 것을 목표로 작성하십시오.
6. 아래 섹션을 모두, 지정된 스키마의 필드 이름 그대로 채워야 합니다.
7. 사용자가 남긴 참고 메모(사용자 메모)가 주어지면, 이는 검증된 사실이 아니라 참고 정보입니다.
   이를 근거로 단정적인 결론을 내리지 말고, 해석의 참고 자료로만 사용하십시오.
8. 검사 완료 시점 정보가 주어지고 그 간격이 큰 경우, 하나의 동일 시점 심리 상태로 단정하기
   어렵다는 점을 관련 서술(예: currentMentalHealthStatus, overallSummary) 안에서 자연스럽게
   언급하십시오. 억지로 별도 문장을 만들 필요는 없습니다.
9. 이전 리포트 대비 비교 자료(순수 수치)가 주어지면, changesSincePrevious/improvedAreas/
   worsenedAreas/unchangedAreas/areasToWatch 5개 필드를 Person Model 수준에서 통합적으로
   서술하십시오 — 점수를 단순 나열하지 말고, 여러 검사의 변화가 만드는 하나의 이야기로
   종합하십시오. 이 비교 자료가 주어지지 않으면(첫 리포트) 5개 필드는 반드시 null로 반환하십시오.
10. 과거 리포트에 대한 사용자 피드백 집계가 주어지면, 이는 확정된 사실이 아니라 사용자의 과거
    반응 횟수일 뿐입니다. 특정 섹션이 반복적으로 "아니다"로 표시되었다면 그 가설을 맹목적으로
    반복하지 말고 재검토하되, 반복 횟수 자체를 사실처럼 서술하지 마십시오.
11. claimsConfidence 배열에는 다음 섹션들(${CLAIM_SECTION_KEYS.join(', ')})마다 confidence
    (HIGH/MEDIUM/LOW)를 매기십시오. HIGH면 evidence에 근거로 삼은 testCode를 채우고,
    MEDIUM/LOW면 reason에 확신이 낮은 이유(예: "근거 부족", "추가 정보 필요")를 채우십시오.
    이는 의학적 확실성이 아니라 당신의 해석적 확신 수준을 표현하기 위함입니다.

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
