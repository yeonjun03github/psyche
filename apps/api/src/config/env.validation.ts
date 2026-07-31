import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('api/v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  // 로컬 Docker Redis는 비밀번호가 없지만, Railway 등 매니지드 Redis는 필요하다.
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google Cloud Console에서 발급받은 OAuth 2.0 클라이언트 ID (Web application).
  // ID 토큰 검증에만 쓰이며, 클라이언트 시크릿은 필요 없다(프론트가 GIS로 받은 idToken을 그대로 검증).
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

  // 특정 벤더에 종속되지 않도록 AI_PROVIDER 하나로 Gemini/OpenAI/Groq 중 사용할 Provider를 고른다.
  AI_PROVIDER: z.enum(['gemini', 'openai', 'groq']).default('gemini'),

  GEMINI_API_KEY: z.string().optional(),
  // 특정 모델 버전이 아니라 별칭(alias)을 기본값으로 둔다 — 특정 버전은 예고 없이
  // 신규 사용자에게 서비스 종료될 수 있음을 실제로 겪었다(gemini-2.5-flash 404).
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1'),

  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),

  FILE_STORAGE_ROOT: z.string().default('./storage'),

  // 시드 스크립트가 생성하는 유일한 비밀번호 로그인 계정(관리자). 일반 사용자는 Google 로그인으로 가입한다.
  ADMIN_EMAIL: z.string().email().default('me@psyche.local'),
  ADMIN_PASSWORD: z.string().min(8).default('changeme123!'),
  ADMIN_NAME: z.string().default('Owner'),

  // 일반 사용자가 리포트 생성을 연타해 AI 호출 비용이 새는 것을 막는 쿨다운. ADMIN 역할은 예외.
  REPORT_CREATION_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(10),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`환경 변수 검증 실패:\n${result.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return result.data;
}
