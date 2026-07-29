import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import type { AIGenerationRequest, AIProvider } from '../ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly modelId: string;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.modelId = model;
  }

  async generateJson(request: AIGenerationRequest): Promise<unknown> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: request.schemaName, schema: request.jsonSchema, strict: true },
      },
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new InternalServerErrorException('OpenAI 응답에서 내용을 받지 못했습니다.');
    }
    return JSON.parse(content);
  }
}
