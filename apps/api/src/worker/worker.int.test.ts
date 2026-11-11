import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import type { EventEnvelope } from '@lg/contracts';
import { closeDb, createDb, type Database, outboxConsumptions, outboxEvents } from '@lg/db';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QUEUES, QueueService } from '../common/queue/queue.service.js';
import { CronJobs } from '../common/scheduler/cron-jobs.js';
import { EventHandlers, OutboxRelay, OutboxService } from '../modules/outbox/index.js';
import {
  createWorkerTestContext,
  TEST_BOARD,
  waitFor,
  type WorkerTestContext,
} from '../test/worker-context.js';
import { BoardServer } from './board.server.js';

const seen: string[] = [];
let cronRuns = 0;

/** Haqiqiy modul kabi: handler va cron'ni onModuleInit'da ro'yxatdan o'tkazadi. */
@Module({})
class ProbeModule implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly handlers: EventHandlers,
    @Inject(CronJobs) private readonly cron: CronJobs,
  ) {}

  onModuleInit(): void {
    this.handlers.on('SystemHeartbeat', 'probe.record', async (e) => {
      if (e.payload.at === 'fail') throw new Error('kutilgan xato');
      seen.push(e.eventId);
    });
    this.cron.register({
      id: 'probe.tick',
      pattern: '*/1 * * * * *',
      run: async () => void cronRuns++,
    });
  }
}

let t: WorkerTestContext;
let db: Database;
const svc = <T>(token: new (...args: never[]) => T): T => t.ctx.get(token);
const count = async (where?: ReturnType<typeof eq>) => db.$count(outboxEvents, where);

beforeAll(async () => {
  t = await createWorkerTestContext([ProbeModule], async (prefix) => {
    // Avvaldan qolgan (reyestrda yo'q) scheduler — sinxronlashda o'chirilishi kerak.
    const connection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6380', {
      maxRetriesPerRequest: null,
    });
    const q = new Queue(QUEUES.cron, { connection, prefix });
    await q.upsertJobScheduler('old.removed', { pattern: '0 0 * * *' }, { name: 'old.removed' });
    await q.close();
    await connection.quit();
  });
  db = createDb(t.db.url, { max: 2 });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Outbox (T-005, 03 §4)', () => {
  it("tranzaksiya bekor bo'lsa event ham yo'q; commit bo'lsa — bor", async () => {
    const outbox = svc(OutboxService);
    await db
      .transaction(async (tx) => {
        await outbox.publish('SystemHeartbeat', { at: 'rollback' }, tx);
        throw new Error('rollback');
      })
      .catch(() => undefined);
    expect(await count()).toBe(0);
  });

  it('event → relay → navbat → handler (bir marta), processed_at belgilanadi', async () => {
    const id = await svc(OutboxService).publish('SystemHeartbeat', { at: 'now' });
    await waitFor(() => seen.includes(id));
    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, id));
    expect(row?.processedAt).not.toBeNull();
    const job = await svc(QueueService).queue(QUEUES.events).getJob(id);
    expect(job?.id).toBe(id); // jobId = event id → takror qo'shilmaydi
  });

  it("qayta yetkazilgan event handler'ni qayta ishga tushirmaydi (event id dedup)", async () => {
    const id = await svc(OutboxService).publish('SystemHeartbeat', { at: 'dup' });
    await waitFor(() => seen.includes(id));
    const envelope: EventEnvelope = {
      eventId: id,
      type: 'SystemHeartbeat',
      payload: { at: 'dup' },
      occurredAt: new Date().toISOString(),
    };
    await svc(EventHandlers).dispatch(envelope);
    await svc(EventHandlers).dispatch(envelope);
    expect(seen.filter((x) => x === id)).toHaveLength(1);
    expect(await db.$count(outboxConsumptions, eq(outboxConsumptions.eventId, id))).toBe(1);
  });

  it("SKIP LOCKED: parallel relay'lar har event'ni bir marta uzatadi", async () => {
    const relay = svc(OutboxRelay);
    const ids = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        svc(OutboxService).publish('SystemHeartbeat', { at: `p${i}` }),
      ),
    );
    const relayed = (
      await Promise.all([relay.relayOnce(), relay.relayOnce(), relay.relayOnce()])
    ).reduce((a, b) => a + b, 0);
    expect(relayed).toBeLessThanOrEqual(ids.length); // fon relay ham qatnashishi mumkin
    await waitFor(() => ids.every((id) => seen.includes(id)));
    for (const id of ids) expect(seen.filter((x) => x === id)).toHaveLength(1);
  });

  it('handler urinishlari tugasa → dead-letter navbati', async () => {
    const queues = svc(QueueService);
    const envelope: EventEnvelope = {
      eventId: '019a0000-0000-7000-8000-00000000dead',
      type: 'SystemHeartbeat',
      payload: { at: 'fail' },
      occurredAt: new Date().toISOString(),
    };
    // FK uchun outbox qatori ham kerak (iste'mol belgisi unga bog'langan).
    await db.insert(outboxEvents).values({
      id: envelope.eventId,
      type: envelope.type,
      payload: envelope.payload,
      processedAt: new Date(),
    });
    await queues
      .queue(QUEUES.events)
      .add('SystemHeartbeat', envelope, { jobId: 'dl-probe', attempts: 1 });
    const dead = queues.queue(QUEUES.deadLetter);
    await waitFor(async () => (await dead.getJob('events__dl-probe')) !== undefined);
    const job = await dead.getJob('events__dl-probe');
    expect(job?.data).toMatchObject({ queue: 'events', error: 'kutilgan xato', attemptsMade: 1 });
  });
});

describe('Cron (T-005)', () => {
  it("ro'yxatdagi vazifa ishlaydi; scheduler idempotent; eskisi o'chiriladi", async () => {
    await waitFor(() => cronRuns >= 2, 8000);
    const schedulers = await svc(QueueService).queue(QUEUES.cron).getJobSchedulers();
    expect(schedulers.map((s) => s.key)).toEqual(['probe.tick']);
    expect(schedulers[0]?.tz).toBe('Asia/Tashkent');
  });
});

describe('Bull Board (T-005: faqat ichki, auth bilan)', () => {
  const url = (path: string) => `http://127.0.0.1:${svc(BoardServer).port()}${path}`;
  const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;

  it("auth'siz 401, noto'g'ri parol 401, to'g'ri — 200", async () => {
    expect((await fetch(url('/queues'))).status).toBe(401);
    expect(
      (await fetch(url('/queues'), { headers: { authorization: basic('board', 'x') } })).status,
    ).toBe(401);
    const ok = await fetch(url('/queues'), {
      headers: { authorization: basic(TEST_BOARD.user, TEST_BOARD.password) },
    });
    expect(ok.status).toBe(200);
  });

  it("/health/live — auth'siz (konteyner healthcheck)", async () => {
    expect((await fetch(url('/health/live'))).status).toBe(200);
  });
});
