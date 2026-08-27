/**
 * 이 서비스는 특정 LLM 벤더에 종속되지 않는다. AIProvider는 "시스템/사용자 프롬프트와
 * JSON Schema를 주면, 그 스키마를 만족하는 JSON을 돌려준다"는 계약만 정의하고,
 * 어떤 벤더(Gemini/OpenAI/Groq)를 쓸지는 환경변수 AI_PROVIDER 하나로 결정된다(ai-provider.factory.ts).
 */
export interface AIGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  /** JSON Schema(Draft 7 계열). zod의 z.toJSONSchema()로 생성해 벤더 SDK에 그대로 전달한다. */
  jsonSchema: Record<string, unknown>;
  schemaName: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AITextGenerationRequest {
  systemPrompt: string;
  /** 대화 히스토리 전체(직전 사용자 메시지 포함) — 벤더별 role 표기로 변환하는 것은 각 provider의 책임. */
  messages: AIChatMessage[];
  /**
   * true면 리포트 생성용 "품질 우선" 모델보다, 짧은 대화 응답에 맞는 더 빠른 모델을 우선
   * 시도한다(지원하지 않는 provider는 무시해도 된다) — 리포트 채팅처럼 사용자가 실시간으로
   * 기다리는 멀티턴 대화에서 쓴다.
   */
  preferFast?: boolean;
}

export interface AIProvider {
  readonly name: string;
  /** 실제 모델 식별자(예: gemini-flash-latest) — 리포트 재현성을 위해 AIReport.aiModel에 기록된다. */
  readonly modelId: string;
  /** 스키마를 만족하는 JSON을 반환한다. 파싱된 값의 zod 검증은 호출자(report-schema.ts)의 책임이다. */
  generateJson(request: AIGenerationRequest): Promise<unknown>;
  /** 자유 형식 텍스트 응답을 반환한다 — 리포트 채팅처럼 스키마가 필요 없는 멀티턴 대화용. */
  generateText(request: AITextGenerationRequest): Promise<string>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
