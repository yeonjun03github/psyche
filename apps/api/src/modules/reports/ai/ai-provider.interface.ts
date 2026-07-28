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

export interface AIProvider {
  readonly name: string;
  /** 스키마를 만족하는 JSON을 반환한다. 파싱된 값의 zod 검증은 호출자(report-schema.ts)의 책임이다. */
  generateJson(request: AIGenerationRequest): Promise<unknown>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
