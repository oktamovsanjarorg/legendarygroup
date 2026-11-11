import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Body, Controller, HttpCode, HttpStatus, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';
import type { Database } from '@lg/db';
import { idempotencyKeys } from '@lg/db';
import { ConfigModule } from '../../config/config.module.js';
import { ClockModule } from '../clock/clock.module.js';
import { DbModule } from '../db/db.module.js';
import { DB_TOKEN } from '../db/db.tokens.js';
import { GlobalExceptionFilter } from '../filters/http-exception.filter.js';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';

const ROOT_ENV = fileURLToPath(new URL('../../../../../.env', import.meta.url));
if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

@Controller('test-idempotency')
class DummyController {
  @Post('action')
  @HttpCode(HttpStatus.OK)
  handleAction(@Body() body: Record<string, unknown>) {
    return { success: true, received: body };
  }
}

@Module({
  imports: [ConfigModule, ClockModule, DbModule],
  controllers: [DummyController],
  providers: [IdempotencyInterceptor],
})
class TestIdempotencyModule {}

describe('IdempotencyInterceptor integratsiya testi (T-004 AC)', () => {
  let app: NestFastifyApplication;
  let db: Database;
  const testKey = `test-key-${Date.now()}`;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      TestIdempotencyModule,
      new FastifyAdapter(),
      { logger: false },
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    const interceptor = app.get(IdempotencyInterceptor);
    app.useGlobalInterceptors(interceptor);

    db = app.get<Database>(DB_TOKEN);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, testKey));
    await app.close();
  });

  it('birinchi soʻrov muvaffaqiyatli bajariladi va saqlanadi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-idempotency/action',
      headers: { 'idempotency-key': testKey },
      payload: { amount: 50000 },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.received).toEqual({ amount: 50000 });
  });

  it('bir xil kalit va bir xil body bilan qayta soʻrov keshdan replay qilinadi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-idempotency/action',
      headers: { 'idempotency-key': testKey },
      payload: { amount: 50000 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['idempotent-replay']).toBe('true');
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.received).toEqual({ amount: 50000 });
  });

  it('bir xil kalit lekin boshqa body bilan soʻrov 422 IDEMPOTENCY_CONFLICT beradi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-idempotency/action',
      headers: { 'idempotency-key': testKey },
      payload: { amount: 99999 },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.code).toBe('IDEMPOTENCY_CONFLICT');
  });
});
