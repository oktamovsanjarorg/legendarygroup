import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bootstrapWorker, WORKER_VERSION } from './index.js';

const ROOT_ENV = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

describe('Worker bootstrap (T-004 AC)', () => {
  it('WORKER_VERSION aniqlangan', () => {
    expect(WORKER_VERSION).toBe('0.1.0');
  });

  it('bootstrapWorker NestJS kontekstini muvaffaqiyatli ishga tushiradi', async () => {
    const context = await bootstrapWorker();
    expect(context).toBeDefined();
    await context.close();
  });
});
