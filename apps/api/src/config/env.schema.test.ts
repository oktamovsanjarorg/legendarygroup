import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema.js';

const valid = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://u:p@localhost:5434/db',
  REDIS_URL: 'redis://localhost:6380',
  INTERNAL_API_TOKEN: 'x'.repeat(32),
  TELEGRAM_BOT_TOKEN: '1:' + 'a'.repeat(30),
  JWT_ACCESS_SECRET: 'j'.repeat(32),
  TOTP_ENCRYPTION_KEY: 'a'.repeat(64),
  CORS_ORIGINS: 'http://localhost:5173, http://localhost:5174',
};

describe('Config env validatsiyasi (T-004)', () => {
  it("to'g'ri env qabul qilinadi, standartlar va CORS ro'yxati", () => {
    const c = validateEnv(valid);
    expect(c.PORT).toBe(3000);
    expect(c.LOG_LEVEL).toBe('info');
    expect(c.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://localhost:5174']);
  });

  it.each([
    'NODE_ENV',
    'DATABASE_URL',
    'REDIS_URL',
    'INTERNAL_API_TOKEN',
    'JWT_ACCESS_SECRET',
    'TOTP_ENCRYPTION_KEY',
    'CORS_ORIGINS',
  ])("%s yo'q bo'lsa ilova ishga tushmaydi (yashirin standart yo'q)", (key) => {
    const env = Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));
    expect(() => validateEnv(env)).toThrow(key);
  });

  it.each([
    ['DATABASE_URL', 'mysql://localhost/db'],
    ['REDIS_URL', 'http://localhost:6380'],
    ['INTERNAL_API_TOKEN', 'short'],
    ['NODE_ENV', 'prod'],
    ['PORT', '70000'],
  ])("%s=%s noto'g'ri", (key, value) => {
    expect(() => validateEnv({ ...valid, [key]: value })).toThrow(key);
  });

  it('xato xabarida sir qiymati chiqmaydi', () => {
    const secret = 'S3cr3t-value-that-must-not-leak';
    expect(() => validateEnv({ ...valid, INTERNAL_API_TOKEN: secret })).toThrow(
      expect.not.objectContaining({ message: expect.stringContaining(secret) }),
    );
  });
});
