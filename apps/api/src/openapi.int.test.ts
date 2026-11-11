import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from './app.factory.js';

const ROOT_ENV = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

describe('OpenAPI /docs integratsiya testi (T-004 AC)', () => {
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

  it('development muhitida /docs/json OpenAPI JSON qaytaradi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(res.statusCode).toBe(200);
    const doc = res.json();
    expect(doc.openapi).toBeDefined();
    expect(doc.info.title).toBe('Legendary Group API');
    expect(doc.paths['/health/live']).toBeDefined();
    expect(doc.paths['/health/ready']).toBeDefined();
    expect(doc.paths['/internal/ping']).toBeDefined();
  });
});
