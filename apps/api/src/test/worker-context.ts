import type { DynamicModule, INestApplicationContext, Type } from '@nestjs/common';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { QUEUES } from '../common/queue/queue.service.js';
import { bootstrapWorker } from '../worker-bootstrap.js';
import { testEnv } from './env.js';

export const TEST_BOARD = { user: 'board', password: 'board_password_for_tests_123' };

export interface WorkerTestContext {
  ctx: INestApplicationContext;
  db: TempDb;
  prefix: string;
  close: () => Promise<void>;
}

const redisUrl = (): string => process.env['REDIS_URL'] ?? 'redis://localhost:6380';

/** Shu prefiksdagi barcha navbatlarni tozalaydi (test izolyatsiyasi). */
async function obliterate(prefix: string): Promise<void> {
  const connection = new Redis(redisUrl(), { maxRetriesPerRequest: null });
  for (const name of Object.values(QUEUES)) {
    const q = new Queue(name, { connection, prefix });
    await q.obliterate({ force: true });
    await q.close();
  }
  await connection.quit();
}

/** To'liq worker: vaqtinchalik DB + alohida Redis prefiksi + tasodifiy port. */
export async function createWorkerTestContext(
  extra: (Type | DynamicModule)[] = [],
  before?: (prefix: string) => Promise<void>,
): Promise<WorkerTestContext> {
  const db = await createTempDb();
  const prefix = `lgtest${process.pid}${Date.now() % 1e6}`;
  await before?.(prefix);
  const env = testEnv({
    DATABASE_URL: db.url,
    REDIS_URL: redisUrl(),
    QUEUE_PREFIX: prefix,
    WORKER_PORT: '0',
    BULL_BOARD_USER: TEST_BOARD.user,
    BULL_BOARD_PASSWORD: TEST_BOARD.password,
  });
  const ctx = await bootstrapWorker(env, extra);
  return {
    ctx,
    db,
    prefix,
    close: async () => {
      await ctx.close();
      await obliterate(prefix);
      await db.drop();
    },
  };
}

/** Shart bajarilguncha kutadi (asinxron worker natijalari uchun). */
export async function waitFor(check: () => Promise<boolean> | boolean, timeoutMs = 10_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`waitFor: ${timeoutMs} ms ichida shart bajarilmadi`);
}
