import { AI_REPORT_SECTION_LABELS } from '@psyche/shared';

export interface ChatTestScoreInput {
  testName: string;
  normalizedScore: number | null;
  band: string | null;
  subscaleScores: { name: string; normalizedScore: number; band: string }[];
}

/** claimsConfidence 등 표시하지 않는 필드까지 강타입으로 요구하지 않도록, 실제로 쓰는 서술 필드만 느슨하게 받는다. */
type ChatReportSections = Record<keyof typeof AI_REPORT_SECTION_LABELS, string | null | undefined>;

export interface BuildChatSystemPromptInput {
  testScores: ChatTestScoreInput[];
  sections: ChatReportSections;
  reportContext?: string | null;
}

function formatTestScores(items: ChatTestScoreInput[]): string {
  return items
    .map((item) => {
      if (item.normalizedScore != null) {
        return `- ${item.testName}: ${item.normalizedScore}/100 (${item.band})`;
      }
      const subLines = item.subscaleScores.map((s) => `    - ${s.name}: ${s.normalizedScore}/100 (${s.band})`).join('\n');
      return `- ${item.testName}\n${subLines}`;
    })
    .join('\n');
}

function formatSections(sections: ChatReportSections): string {
  return (Object.keys(AI_REPORT_SECTION_LABELS) as (keyof typeof AI_REPORT_SECTION_LABELS)[])
    .map((key) => {
      const value = sections[key];
      if (value == null) return null;
      return `## ${AI_REPORT_SECTION_LABELS[key]}\n${value}`;
    })
    .filter((line): line is string => line !== null)
    .join('\n\n');
}

/**
 * 리포트 상세 화면에서 텍스트를 드래그해 던지는 후속 질문에 답하는 "Psyche AI 상담 세션"의
 * 시스템 프롬프트. 매 호출마다 그 리포트의 실제 검사 점수와 이미 생성된 리포트 전문을 통째로
 * 넘겨 맥락으로 삼는다 — 별도로 요약을 만들어 저장하지 않고 항상 원본에서 재구성한다.
 */
export function buildChatSystemPrompt(input: BuildChatSystemPromptInput): string {
  return `당신은 Psyche 앱에서 사용자가 이미 받은 심리 리포트에 대해 후속 질문에 답하는
"Psyche AI 상담 세션"입니다. 사용자는 리포트를 읽다가 특정 문장을 드래그로 선택해 "이 부분에
대해 질문하기"를 눌러 대화를 시작했을 수 있습니다.

아래는 이 사용자의 실제 검사 점수와, 이미 생성되어 사용자가 읽고 있는 리포트 전문입니다.

--- 실제 검사 점수 ---
${formatTestScores(input.testScores)}

${input.reportContext ? `--- 사용자가 리포트 생성 시 남긴 참고 메모(사실 아님) ---\n${input.reportContext}\n` : ''}
--- 이미 생성된 리포트 전문 ---
${formatSections(input.sections)}

답변 규칙:
1. 오직 위 검사 점수와 리포트 내용에 근거해서만 답하십시오. 리포트에 없는 새로운 사실이나
   원인을 지어내지 마십시오. 리포트에서 다루지 않은 질문이라면 "이 리포트만으로는 답하기
   어렵습니다"라고 솔직히 말하십시오.
2. 리포트 본문이 이미 지킨 원칙을 답변에서도 동일하게 지키십시오 — 검사 결과에서 직접
   확인되는 사실, 사용자가 보고한 상황, 해석, 원인 가설을 서로 구분하고, "~ 때문이다"처럼
   확인되지 않은 인과를 단정하지 마십시오. 원인을 물으면 "~일 가능성을 생각해볼 수 있습니다"
   처럼 가설로만 답하고, 시작 시점이나 선후관계를 모르면 그 사실을 명시하십시오.
3. 의학적 진단이나 치료 지시를 하지 마십시오. 사용자의 메시지에서 자해·자살 등 위기 신호가
   보이면, 리포트 해석보다 안전을 최우선으로 응답하고 전문가 상담이나 자살예방상담전화(1393)
   같은 도움을 받을 수 있는 경로를 안내하십시오.
4. 검사명이나 점수를 딱딱하게 나열하지 말고, 상담사가 대화하듯 자연스러운 한국어 구어체로
   답하십시오. 답은 짧고 명확하게 — 한 번에 여러 주제를 욱여넣지 마십시오.
5. 사용자가 리포트에서 드래그해 가져온 문장이 메시지에 포함되어 있다면, 그 문장이 어떤
   맥락에서 나온 서술인지 리포트 전체 관점에서 설명하는 데 우선순위를 두십시오.`;
}
