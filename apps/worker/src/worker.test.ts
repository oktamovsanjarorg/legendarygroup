import { describe, expect, it } from 'vitest';
import { EnvService } from '@lg/api';
import { bootstrapWorker } from './index.js';

// `.env` fayliga bog'liq emas (CI). DB/Redis ulanishlari "lazy" — bootstrap tarmoqqa chiqmaydi.
const env = new EnvService({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://u:p@127.0.0.1:1/none',
  REDIS_URL: 'redis://127.0.0.1:1',
  INTERNAL_API_TOKEN: 'worker_test_token_0123456789abcdef',
  CORS_ORIGINS: 'http://localhost',
  LOG_LEVEL: 'silent',
});

describe('Worker bootstrap (T-004)', () => {
  it("HTTP serversiz Nest kontekstini ko'taradi va to'g'ri yopiladi", async () => {
    const context = await bootstrapWorker(env);
    expect(context.get(EnvService).get('NODE_ENV')).toBe('test');
    await context.close();
  });
});
