import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../app.factory.js';

const ROOT_ENV = fileURLToPath(new URL('../../../../../.env', import.meta.url));
if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

describe('Internal API integratsiya testlari (T-004 AC)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    token = created.env.get('INTERNAL_API_TOKEN');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('tokensiz soʻrov 401 MISSING_INTERNAL_TOKEN qaytaradi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/ping',
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe('MISSING_INTERNAL_TOKEN');
    expect(typeof body.requestId).toBe('string');
  });

  it('notoʻgʻri token 401 INVALID_INTERNAL_TOKEN qaytaradi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/ping',
      headers: { 'x-internal-token': 'wrong-token-123456789' },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe('INVALID_INTERNAL_TOKEN');
  });

  it('toʻgʻri token bilan 200 qaytaradi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/ping',
      headers: { 'x-internal-token': token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', internal: true });
  });
});
