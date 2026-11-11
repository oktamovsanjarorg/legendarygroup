import { EnvService } from '../config/env.service.js';

/** Testlar uchun to'liq, `.env` fayliga bog'liq bo'lmagan env (CI'da ham ishlaydi). */
export const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5434/lg_unit_unused',
  REDIS_URL: 'redis://localhost:6380',
  INTERNAL_API_TOKEN: 'test_internal_token_0123456789abcdef',
  CORS_ORIGINS: 'http://localhost:5173',
  LOG_LEVEL: 'silent',
} as const;

export const testEnv = (overrides: Record<string, string> = {}): EnvService =>
  new EnvService({ ...TEST_ENV, ...overrides });
