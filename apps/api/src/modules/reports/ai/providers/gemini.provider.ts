import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type { AIGenerationRequest, AIProvider, AITextGenerationRequest } from '../ai-provider.interface';

/**
 * 리포트는 JSON 스키마 전체를 채우느라 원래 수십~수백 초가 걸린다(실측 평균 89.7초, 최대
 * 257초) — 넉넉하게 잡는다. 반면 채팅은 문장 몇 개짜리 대화형 답변이라 이보다 오래 걸리면
 * 사실상 멈춘 것과 같다 — 짧게 끊고 바로 대체 모델로 넘어가는 게 "느리다"는 체감을 줄인다.
 */
const REPORT_TIMEOUT_MS = 120_000;
const CHAT_TIMEOUT_MS = 25_000;

/**
 * "high demand"(503 UNAVAILABLE)는 특정 모델 하나만 일시적으로 수요가 몰릴 때 나는 오류다 —
 * 실제로 겪어보니 같은 키로 다른 모델(예: lite)은 그 순간에도 멀쩡히 동작했다. 문제는 항상
 * 빠르게 503으로 끝나지는 않는다는 것 — 직접 겪어보니 타임아웃 없이는 2분 넘게 응답 없이
 * 그냥 멈춰있었다. 그래서 요청에 타임아웃을 걸고, 타임아웃도 high demand와 똑같이 취급해
 * 대체 모델로 즉시 재시도한다. BullMQ의 3회 재시도(수 초~수십 초 간격)만으로는 이 정도
 * 지속되는 과부하/행을 버티기엔 너무 짧다.
 */
function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const name = (error as { name?: string })?.name;
  const message = error instanceof Error ? error.message : String(error);
  return (
    status === 503 ||
    status === 504 ||
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    /UNAVAILABLE|high demand|timeout|aborted|ETIMEDOUT|ECONNRESET|DEADLINE_EXCEEDED|deadline exceeded/i.test(message)
  );
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

  /**
   * primaryModel이 high demand/타임아웃으로 실패하면 fallbackModel로 한 번 더 시도한다.
   * fallbackModel이 없거나 primaryModel과 같으면(= 이미 가장 빠른 모델을 쓰고 있으면) 재시도할
   * 곳이 없으니 그대로 던진다.
   */
  private async withFallback<T>(
    primaryModel: string,
    fallbackModel: string | undefined,
    run: (model: string) => Promise<T>,
  ): Promise<T> {
    try {
      return await run(primaryModel);
    } catch (error) {
      if (!fallbackModel || fallbackModel === primaryModel || !isRetryableError(error)) {
        throw error;
      }
      GeminiProvider.logger.warn(`${primaryModel}이(가) high demand/타임아웃으로 실패해 ${fallbackModel}로 재시도합니다.`);
      return run(fallbackModel);
    }
  }

  async generateJson(request: AIGenerationRequest): Promise<unknown> {
    const text = await this.withFallback(this.model, this.fallbackModel, async (model) => {
      const response = await this.client.models.generateContent({
        model,
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: request.jsonSchema,
          httpOptions: { timeout: REPORT_TIMEOUT_MS },
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
    // preferFast면 애초에 "품질 우선" 모델을 거치지 않고 대체(경량) 모델로 바로 시작한다 —
    // 실측상 품질 모델이 25초 타임아웃까지 기다렸다 넘어가는 것보다, 처음부터 2초대인 경량
    // 모델로 시작하는 편이 채팅 체감 속도에 압도적으로 유리했다. 이 경우 더 물러설 곳이
    // 없으니(이미 가장 빠른 모델) 실패하면 그대로 던진다.
    const primaryModel = request.preferFast && this.fallbackModel ? this.fallbackModel : this.model;
    const fallbackModel = primaryModel === this.fallbackModel ? undefined : this.fallbackModel;

    const text = await this.withFallback(primaryModel, fallbackModel, async (model) => {
      const response = await this.client.models.generateContent({
        model,
        contents: request.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        config: { systemInstruction: request.systemPrompt, httpOptions: { timeout: CHAT_TIMEOUT_MS } },
      });
      return response.text;
    });

    if (!text) {
      throw new InternalServerErrorException('Gemini 응답에서 텍스트를 받지 못했습니다.');
    }
    return text;
  }
}
