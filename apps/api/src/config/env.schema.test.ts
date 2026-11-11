import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema.js';

describe('Config env validatsiyasi (T-004 AC)', () => {
  const validBase = {
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5434/test_db',
    REDIS_URL: 'redis://localhost:6380',
    INTERNAL_API_TOKEN: 'super_secret_token_at_least_16_chars_long',
  };

  it('toʻgʻri env qiymatlarini muvaffaqiyatli qabul qiladi', () => {
    const config = validateEnv(validBase);
    expect(config.DATABASE_URL).toBe(validBase.DATABASE_URL);
    expect(config.REDIS_URL).toBe(validBase.REDIS_URL);
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.TZ).toBe('Asia/Tashkent');
  });

  it('DATABASE_URL yoʻq boʻlsa xato tashlaydi', () => {
    const env = { ...validBase, DATABASE_URL: '' };
    expect(() => validateEnv(env)).toThrow('DATABASE_URL');
  });

  it('REDIS_URL yoʻq boʻlsa xato tashlaydi', () => {
    const env = { ...validBase, REDIS_URL: '' };
    expect(() => validateEnv(env)).toThrow('REDIS_URL');
  });

  it('INTERNAL_API_TOKEN 16 belgidan qisqa boʻlsa xato tashlaydi', () => {
    const env = { ...validBase, INTERNAL_API_TOKEN: 'short' };
    expect(() => validateEnv(env)).toThrow('INTERNAL_API_TOKEN');
  });

  it('PORT raqamga aylantiriladi', () => {
    const env = { ...validBase, PORT: '8080' };
    const config = validateEnv(env);
    expect(config.PORT).toBe(8080);
  });
});
