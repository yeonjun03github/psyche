import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import type { AIGenerationRequest, AIProvider, AITextGenerationRequest } from '../ai-provider.interface';

@Injectable()
export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  readonly modelId: string;
  private readonly client: Groq;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Groq({ apiKey });
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
        json_schema: { name: request.schemaName, schema: request.jsonSchema },
      },
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new InternalServerErrorException('Groq 응답에서 내용을 받지 못했습니다.');
    }
    return JSON.parse(content);
  }

  async generateText(request: AITextGenerationRequest): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((m) => ({ role: m.role, content: m.content }) as const),
      ],
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new InternalServerErrorException('Groq 응답에서 내용을 받지 못했습니다.');
    }
    return content;
  }
}
