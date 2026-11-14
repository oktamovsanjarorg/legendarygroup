import { closeDb, createDb, type Database, outboxEvents } from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { FixedClock } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { QueueService } from '../../common/queue/queue.service.js';
import { OutboxRelay, RELAY_MAX_ATTEMPTS, relayBackoffMs } from './outbox.relay.js';
import { OutboxService } from './outbox.service.js';

let redisDown = true;
const added: string[] = [];
/** Redis'siz: navbat "ishlamayapti" yoki qabul qiladi. */
const fakeQueues = {
  queue: () => ({
    add: async (_name: string, _data: unknown, opts: { jobId: string }) => {
      if (redisDown) throw new Error('Connection is closed.');
      added.push(opts.jobId);
    },
  }),
} as unknown as QueueService;

const clock = new FixedClock('2026-11-11T10:00:00.000Z');
let tmp: TempDb;
let db: Database;
let relay: OutboxRelay;
let outbox: OutboxService;

const row = async (id: string) =>
  (await db.select().from(outboxEvents).where(eq(outboxEvents.id, id)))[0];

beforeAll(async () => {
  tmp = await createTempDb();
  db = createDb(tmp.url, { max: 2 });
  relay = new OutboxRelay(db, clock, fakeQueues);
  outbox = new OutboxService(db, clock);
});
afterAll(async () => {
  await closeDb(db);
  await tmp.drop();
});
beforeEach(async () => {
  await db.delete(outboxEvents);
  clock.setNow('2026-11-11T10:00:00.000Z');
  added.length = 0;
  redisDown = true;
});

describe('OutboxRelay — Redis xatosi (T-005 Aniqlik)', () => {
  it('backoff 1s·2ⁿ: muddat kelmaguncha qayta urinmaydi', async () => {
    const id = await outbox.publish('SystemHeartbeat', { at: 'x' });
    expect(await relay.relayOnce()).toBe(0);
    let r = await row(id);
    expect(r).toMatchObject({ attempts: 1, lastError: 'Connection is closed.', failedAt: null });
    expect(r?.nextAttemptAt.toISOString()).toBe('2026-11-11T10:00:01.000Z');

    await relay.relayOnce(); // muddat kelmagan — o'zgarmaydi
    expect((await row(id))?.attempts).toBe(1);

    clock.advance(1000);
    await relay.relayOnce();
    r = await row(id);
    expect(r?.attempts).toBe(2);
    expect(r?.nextAttemptAt.toISOString()).toBe('2026-11-11T10:00:03.000Z'); // +2 s
  });

  it(`${RELAY_MAX_ATTEMPTS} urinishdan keyin failed_at (dead-letter), boshqa olinmaydi`, async () => {
    const id = await outbox.publish('SystemHeartbeat', { at: 'x' });
    for (let i = 1; i <= RELAY_MAX_ATTEMPTS; i++) {
      await relay.relayOnce();
      clock.advance(relayBackoffMs(i));
    }
    const r = await row(id);
    expect(r?.attempts).toBe(RELAY_MAX_ATTEMPTS);
    expect(r?.failedAt).not.toBeNull();
    redisDown = false;
    clock.advance(24 * 60 * 60 * 1000);
    expect(await relay.relayOnce()).toBe(0);
    expect(added).toEqual([]);
  });

  it('Redis tiklansa — uzatiladi, jobId = event id', async () => {
    const id = await outbox.publish('SystemHeartbeat', { at: 'x' });
    await relay.relayOnce();
    redisDown = false;
    clock.advance(1000);
    expect(await relay.relayOnce()).toBe(1);
    expect(added).toEqual([id]);
    expect((await row(id))?.processedAt).not.toBeNull();
  });
});
