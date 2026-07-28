import { createAIProvider } from './ai-provider.factory';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GroqProvider } from './providers/groq.provider';

describe('createAIProvider', () => {
  const base = {
    GEMINI_MODEL: 'gemini-2.5-flash',
    OPENAI_MODEL: 'gpt-4.1',
    GROQ_MODEL: 'openai/gpt-oss-120b',
  };

  it('AI_PROVIDER=gemini이고 키가 있으면 GeminiProvider를 반환한다', () => {
    const provider = createAIProvider({ ...base, AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'key' });
    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe('gemini');
  });

  it('AI_PROVIDER=openai이고 키가 있으면 OpenAIProvider를 반환한다', () => {
    const provider = createAIProvider({ ...base, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'key' });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('AI_PROVIDER=groq이고 키가 있으면 GroqProvider를 반환한다', () => {
    const provider = createAIProvider({ ...base, AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    expect(provider).toBeInstanceOf(GroqProvider);
  });

  it('선택된 Provider의 API 키가 없으면 에러를 던진다', () => {
    expect(() => createAIProvider({ ...base, AI_PROVIDER: 'gemini' })).toThrow(/GEMINI_API_KEY/);
    expect(() => createAIProvider({ ...base, AI_PROVIDER: 'openai' })).toThrow(/OPENAI_API_KEY/);
    expect(() => createAIProvider({ ...base, AI_PROVIDER: 'groq' })).toThrow(/GROQ_API_KEY/);
  });
});
