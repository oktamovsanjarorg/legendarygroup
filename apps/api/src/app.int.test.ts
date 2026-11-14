import { createTempDb, type TempDb } from '@lg/db/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.factory.js';
import { testEnv, TEST_ENV } from './test/env.js';
import { createRealTestApp, type TestApp } from './test/test-app.js';

/** Real `createApp()` — marshrutlar, health, internal, OpenAPI (T-004 AC). */
describe('API ilovasi (T-004)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createRealTestApp();
  });
  afterAll(() => t.close());

  const get = (url: string, headers: Record<string, string> = {}) =>
    t.app.inject({ method: 'GET', url, headers });

  it('GET /api/health/live → 200', async () => {
    const res = await get('/api/health/live');
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe('ok');
  });

  it('GET /api/health/ready → DB va Redis up', async () => {
    const res = await get('/api/health/ready');
    expect(res.statusCode).toBe(200);
    expect(res.json<{ checks: object }>().checks).toEqual({ database: 'up', redis: 'up' });
  });

  it('GET /api/health/metrics → Prometheus OpenMetrics formati', async () => {
    const res = await get('/api/health/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('process_uptime_seconds');
    expect(res.body).toContain('service_database_up 1');
    expect(res.body).toContain('service_redis_up 1');
  });

  it("prefiksiz /health yo'q (barcha tashqi marshrutlar /api ostida)", async () => {
    expect((await get('/health/live')).statusCode).toBe(404);
  });

  it("/internal/* prefiksiz va faqat token bilan; /api/internal yo'q (Caddy tashqariga chiqarmaydi)", async () => {
    expect((await get('/internal/ping')).statusCode).toBe(401);
    const ok = await get('/internal/ping', { 'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN });
    expect(ok.statusCode).toBe(200);
    expect(
      (await get('/api/internal/ping', { 'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN }))
        .statusCode,
    ).toBe(404);
  });

  it('har javobda yagona xato formati va requestId', async () => {
    const res = await get('/api/no-such-route', { 'x-request-id': 'client-req-12345' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', requestId: 'client-req-12345' });
  });

  it("xavfsiz bo'lmagan x-request-id qabul qilinmaydi (log injection)", async () => {
    const res = await get('/api/no-such-route', { 'x-request-id': 'bad id\nINJECTED' });
    expect(res.json<{ requestId: string }>().requestId).not.toContain('INJECTED');
  });

  it('OpenAPI /api/docs/json — test muhitida mavjud', async () => {
    const res = await get('/api/docs/json');
    expect(res.statusCode).toBe(200);
    const doc = res.json<{ paths: Record<string, unknown> }>();
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/api/health/live', '/api/health/ready', '/internal/ping']),
    );
  });
});

describe("Muhitga bog'liq xatti-harakat", () => {
  let db: TempDb;
  beforeAll(async () => {
    db = await createTempDb();
  });
  afterAll(() => db.drop());

  const start = async (overrides: Record<string, string>): Promise<NestFastifyApplication> => {
    const { app } = await createApp(testEnv({ DATABASE_URL: db.url, ...overrides }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    return app;
  };

  it('production: /api/docs yopiq', async () => {
    const app = await start({ NODE_ENV: 'production' });
    expect((await app.inject({ url: '/api/docs/json' })).statusCode).toBe(404);
    await app.close();
  });

  it('Redis ishlamasa readiness → 503 SERVICE_UNAVAILABLE (tafsilot bilan)', async () => {
    const app = await start({ REDIS_URL: 'redis://127.0.0.1:1' });
    const res = await app.inject({ url: '/api/health/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      details: { database: 'up', redis: 'down' },
    });
    await app.close();
  });
});
