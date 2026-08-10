import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER, type AIProvider } from './ai-provider.interface';
import { createAIProvider } from './ai-provider.factory';
import type { EnvConfig } from '../../../config/env.validation';

const logger = new Logger('AiModule');

@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (config: ConfigService<EnvConfig, true>): AIProvider => {
        try {
          return createAIProvider({
            AI_PROVIDER: config.get('AI_PROVIDER', { infer: true }),
            GEMINI_API_KEY: config.get('GEMINI_API_KEY', { infer: true }),
            GEMINI_MODEL: config.get('GEMINI_MODEL', { infer: true }),
            OPENAI_API_KEY: config.get('OPENAI_API_KEY', { infer: true }),
            OPENAI_MODEL: config.get('OPENAI_MODEL', { infer: true }),
            GROQ_API_KEY: config.get('GROQ_API_KEY', { infer: true }),
            GROQ_MODEL: config.get('GROQ_MODEL', { infer: true }),
          });
        } catch (error) {
          // API 키가 아직 없어도 앱 전체가 부팅 실패하면 안 된다 — 검사 응시 등 AI와
          // 무관한 기능은 계속 동작해야 한다. 실제로 리포트 생성을 시도할 때만 실패시킨다.
          const message = (error as Error).message;
          logger.warn(`AIProvider를 초기화하지 못했습니다: ${message} (리포트 생성 시도 시에만 실패합니다)`);
          return {
            name: 'unconfigured',
            modelId: 'unconfigured',
            generateJson() {
              return Promise.reject(new Error(message));
            },
            generateText() {
              return Promise.reject(new Error(message));
            },
          };
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
