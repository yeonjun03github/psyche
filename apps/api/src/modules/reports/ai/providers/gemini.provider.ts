import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type { AIGenerationRequest, AIProvider } from '../ai-provider.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly modelId: string;
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
    this.modelId = model;
  }

  async generateJson(request: AIGenerationRequest): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: request.jsonSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new InternalServerErrorException('Gemini 응답에서 텍스트를 받지 못했습니다.');
    }
    return JSON.parse(text);
  }
}
