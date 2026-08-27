import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type { AIGenerationRequest, AIProvider, AITextGenerationRequest } from '../ai-provider.interface';

/**
 * "high demand"(503 UNAVAILABLE)는 특정 모델 하나만 일시적으로 수요가 몰릴 때 나는 오류다 —
 * 실제로 겪어보니 같은 키로 다른 모델(예: lite)은 그 순간에도 멀쩡히 동작했다. BullMQ의 3회
 * 재시도(수 초~수십 초 간격)는 이 정도 지속되는 과부하를 버티기엔 너무 짧아서 리포트가 그냥
 * FAILED로 끝나버렸다 — 같은 모델을 다시 두드리는 대신, 그 자리에서 즉시 다른 모델로
 * 한 번 더 시도한다.
 */
function isHighDemandError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : String(error);
  return status === 503 || /UNAVAILABLE|high demand/i.test(message);
}

@Injectable()
export class GeminiProvider implements AIProvider {
  private static readonly logger = new Logger(GeminiProvider.name);

  readonly name = 'gemini';
  readonly modelId: string;
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly fallbackModel?: string;

  constructor(apiKey: string, model: string, fallbackModel?: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
    this.modelId = model;
    this.fallbackModel = fallbackModel && fallbackModel !== model ? fallbackModel : undefined;
  }

  /** 주 모델이 "high demand"로 실패하면, 설정된 대체 모델로 한 번 더 시도한다. */
  private async withFallback<T>(run: (model: string) => Promise<T>): Promise<T> {
    try {
      return await run(this.model);
    } catch (error) {
      if (!this.fallbackModel || !isHighDemandError(error)) {
        throw error;
      }
      GeminiProvider.logger.warn(`${this.model}이(가) high demand로 실패해 ${this.fallbackModel}로 재시도합니다.`);
      return run(this.fallbackModel);
    }
  }

  async generateJson(request: AIGenerationRequest): Promise<unknown> {
    const text = await this.withFallback(async (model) => {
      const response = await this.client.models.generateContent({
        model,
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: request.jsonSchema,
        },
      });
      return response.text;
    });

    if (!text) {
      throw new InternalServerErrorException('Gemini 응답에서 텍스트를 받지 못했습니다.');
    }
    return JSON.parse(text);
  }

  async generateText(request: AITextGenerationRequest): Promise<string> {
    const text = await this.withFallback(async (model) => {
      const response = await this.client.models.generateContent({
        model,
        contents: request.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        config: { systemInstruction: request.systemPrompt },
      });
      return response.text;
    });

    if (!text) {
      throw new InternalServerErrorException('Gemini 응답에서 텍스트를 받지 못했습니다.');
    }
    return text;
  }
}
