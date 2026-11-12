import { EnvService } from '../config/env.service.js';

/** Testlar uchun to'liq, `.env` fayliga bog'liq bo'lmagan env (CI'da ham ishlaydi). */
export const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5434/lg_unit_unused',
  REDIS_URL: 'redis://localhost:6380',
  INTERNAL_API_TOKEN: 'test_internal_token_0123456789abcdef',
  TELEGRAM_BOT_TOKEN: '123456789:TEST_bot_token_for_tests_only_x',
  TELEGRAM_BOT_USERNAME: 'legendary_test_bot',
  PUBLIC_APP_URL: 'https://app.test.lg',
  JWT_ACCESS_SECRET: 'test_jwt_access_secret_0123456789abcdef',
  TOTP_ENCRYPTION_KEY: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  CORS_ORIGINS: 'http://localhost:5173',
  LOG_LEVEL: 'silent',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'eu-central-1',
  S3_BUCKET_FILES: 'lg-local-files',
  S3_ACCESS_KEY_ID: 'minioadmin',
  S3_SECRET_ACCESS_KEY: 'minioadmin',
  S3_FORCE_PATH_STYLE: 'true',
} as const;

export const testEnv = (overrides: Record<string, string> = {}): EnvService =>
  new EnvService({ ...TEST_ENV, ...overrides });
