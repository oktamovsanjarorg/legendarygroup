import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTempDb, type TempDb } from '@lg/db/testing';
import type { Clock } from '@lg/domain';
import { createApp } from '../app.factory.js';
import { ClockModule } from '../common/clock/clock.module.js';
import { DbModule } from '../common/db/db.module.js';
import { GlobalExceptionFilter } from '../common/filters/http-exception.filter.js';
import { IdempotencyModule } from '../common/idempotency/idempotency.module.js';
import { genRequestId } from '../common/logger/request-id.js';
import { ConfigModule } from '../config/config.module.js';
import { requireDatabaseUrl } from '@lg/db';
import { testEnv } from './env.js';

/** Dinamik test modulining ildizi. */
@Module({})
class TestRootModule {}

export interface TestApp {
  app: NestFastifyApplication;
  db: TempDb;
  close: () => Promise<void>;
}

/** Real `createApp()` (prefiks, filtr, OpenAPI) — vaqtinchalik DB bilan. */
export async function createRealTestApp(): Promise<TestApp> {
  const db = await createTempDb();
  const { app } = await createApp(
    testEnv({
      DATABASE_URL: db.url,
      REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6380',
    }),
  );
  return ready(app, db);
}

interface ModuleOptions {
  controllers: Type[];
  clock?: Clock;
  imports?: DynamicModule[];
}

/**
 * Test controller'lari + infratuzilma (Config, Clock, DB, Idempotency) — vaqtinchalik DB bilan.
 * `x-test-user` header'i `request.user.id`ga yoziladi (T-006 gacha auth o'rnida).
 */
export async function createModuleTestApp(opts: ModuleOptions): Promise<TestApp> {
  requireDatabaseUrl();
  const db = await createTempDb();
  const env = testEnv({ DATABASE_URL: db.url });
  const module: DynamicModule = {
    module: TestRootModule,
    imports: [
      ConfigModule.forRoot(env),
      opts.clock ? ClockModule.forRoot(opts.clock) : ClockModule,
      DbModule,
      IdempotencyModule,
      ...(opts.imports ?? []),
    ],
    controllers: opts.controllers,
  };
  const app = await NestFactory.create<NestFastifyApplication>(
    module,
    new FastifyAdapter({ genReqId: genRequestId }),
    { logger: false, abortOnError: false },
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (req) => {
      const user = req.headers['x-test-user'];
      if (typeof user === 'string') Object.assign(req, { user: { id: user } });
    });
  return ready(app, db);
}

async function ready(app: NestFastifyApplication, db: TempDb): Promise<TestApp> {
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return {
    app,
    db,
    close: async () => {
      await app.close();
      await db.drop();
    },
  };
}
