import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../app.factory.js';

const ROOT_ENV = fileURLToPath(new URL('../../../../../.env', import.meta.url));
if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

describe('Health API integratsiya testlari (T-004 AC)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live 200 qaytaradi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/live',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });

  it('GET /health/ready 200 va DB/Redis holatini qaytaradi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.checks).toEqual({
      database: 'up',
      redis: 'up',
    });
    expect(typeof body.timestamp).toBe('string');
  });
});
