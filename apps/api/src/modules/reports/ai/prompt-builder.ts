import { AI_REPORT_SECTION_LABELS } from '@psyche/shared';

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
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

const SYSTEM_PROMPT = `당신은 여러 심리검사 결과를 하나의 사람으로 통합 해석하는 역할을 맡습니다.

반드시 지켜야 할 규칙:
1. 의학적 진단, 질병 판정, 치료 권고를 하지 않습니다. 당신은 해석만 합니다.
2. 검사를 하나씩 나열하며 설명하지 마십시오. 7개 검사 결과 전체를 근거로 삼아 "한 사람"에 대한
   하나의 통합된 이야기를 쓰십시오. 각 섹션은 특정 검사 하나가 아니라 전체 결과의 종합입니다.
3. 원인을 다루는 항목(possibleCausalHypotheses)은 반드시 "~일 가능성이 있습니다",
   "~라는 가설을 세울 수 있습니다"와 같은 표현만 사용하고, "때문이다"처럼 단정적인 인과 표현은
   사용하지 마십시오.
4. 검사 결과 사이의 상관관계를 스스로 찾아 해석하십시오 — 이 상관관계 분석은 코드가 아니라
   당신이 수행해야 하는 핵심 작업입니다.
5. 모든 문장은 한국어로, 사용자가 자기 자신을 더 잘 이해하도록 돕는 것을 목표로 작성하십시오.
6. 아래 14개 섹션을 모두, 지정된 스키마의 필드 이름 그대로 채워야 합니다.

섹션 설명:
${Object.entries(AI_REPORT_SECTION_LABELS)
  .map(([key, label], i) => `${i + 1}. ${key} — ${label}`)
  .join('\n')}`;

function formatTestResult(result: PromptTestResult): string {
  if (result.subscaleScores.length > 0) {
    const factors = result.subscaleScores
      .map((s) => `    - ${s.name}: 정규화 점수 ${s.normalizedScore}/100 (${s.band})`)
      .join('\n');
    return `- ${result.testName} (${result.testCode})\n${factors}`;
  }
  return `- ${result.testName} (${result.testCode}): 정규화 점수 ${result.normalizedScore}/100 (${result.band})`;
}

export function buildReportPrompt(input: BuildReportPromptInput): BuiltPrompt {
  const body = input.testResults.map(formatTestResult).join('\n');
  const userPrompt = `다음은 한 사람이 완료한 7개 필수 심리검사의 표준화된 결과입니다.
원문항 응답이 아니라, 각 검사 자체의 검증된 채점 기준으로 계산된 표준화 점수입니다.

${body}

이 결과들을 하나의 사람으로 통합 해석하여, 지정된 JSON 스키마의 14개 필드를 모두 채워 응답하십시오.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
