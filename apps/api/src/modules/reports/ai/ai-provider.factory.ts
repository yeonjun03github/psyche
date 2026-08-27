import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GroqProvider } from './providers/groq.provider';
import type { AIProvider } from './ai-provider.interface';

export interface AiProviderEnv {
  AI_PROVIDER: 'gemini' | 'openai' | 'groq';
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  /** 주 모델이 일시적으로 "high demand"(503)면 이 모델로 즉시 한 번 더 시도한다. */
  GEMINI_FALLBACK_MODEL: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL: string;
}

/**
 * AI_PROVIDER 환경변수 하나로 Gemini/OpenAI/Groq 중 어떤 구현체를 쓸지 결정한다.
 * 이 함수만 벤더 이름을 알고, 나머지 코드는 AIProvider 인터페이스만 알면 된다.
 */
export function createAIProvider(env: AiProviderEnv): AIProvider {
  switch (env.AI_PROVIDER) {
    case 'openai': {
      if (!env.OPENAI_API_KEY) {
        throw new Error('AI_PROVIDER=openai 인데 OPENAI_API_KEY가 설정되어 있지 않습니다.');
      }
      return new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
    }
    case 'groq': {
      if (!env.GROQ_API_KEY) {
        throw new Error('AI_PROVIDER=groq 인데 GROQ_API_KEY가 설정되어 있지 않습니다.');
      }
      return new GroqProvider(env.GROQ_API_KEY, env.GROQ_MODEL);
    }
    case 'gemini': {
      if (!env.GEMINI_API_KEY) {
        throw new Error('AI_PROVIDER=gemini 인데 GEMINI_API_KEY가 설정되어 있지 않습니다.');
      }
      return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL);
    }
  }
}
