import { closeDb, createDb, type Database, outboxEvents } from '@lg/db';
import { eq } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QUEUES, QueueService } from '../common/queue/queue.service.js';
import { TelegramOutbox } from '../modules/telegram/index.js';
import {
  createWorkerTestContext,
  waitFor,
  type WorkerTestContext,
} from '../test/worker-context.js';

/** Soxta Telegram Bot API: chat_id bo'yicha javob ssenariysi. */
interface Hit {
  chatId: string;
  at: number;
}
const hits: Hit[] = [];
const rateLimitedOnce = new Set<string>();
let fake: FastifyInstance;

async function startFakeTelegram(): Promise<string> {
  fake = Fastify();
  fake.post('/bot:token/:method', async (req, reply) => {
    const { chat_id: chatId } = req.body as { chat_id: string };
    hits.push({ chatId, at: Date.now() });
    if (chatId === 'blocked')
      return reply.code(403).send({
        ok: false,
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user',
      });
    if (chatId === 'bad')
      return reply
        .code(400)
        .send({ ok: false, error_code: 400, description: 'Bad Request: chat not found' });
    if (chatId === 'flood' && !rateLimitedOnce.has(chatId)) {
      rateLimitedOnce.add(chatId);
      return reply.code(429).send({
        ok: false,
        error_code: 429,
        description: 'Too Many Requests',
        parameters: { retry_after: 1 },
      });
    }
    return { ok: true, result: { message_id: hits.length } };
  });
  await fake.listen({ port: 0, host: '127.0.0.1' });
  const addr = fake.server.address();
  return `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
}

let t: WorkerTestContext;
let db: Database;
const send = (chatId: string, key?: string) =>
  t.ctx
    .get(TelegramOutbox)
    .enqueue({ method: 'sendMessage', chatId, payload: { text: 'salom' } }, { dedupeKey: key });
const hitsOf = (chatId: string) => hits.filter((h) => h.chatId === chatId);

beforeAll(async () => {
  const url = await startFakeTelegram();
  t = await createWorkerTestContext([], undefined, { TELEGRAM_API_URL: url });
  db = createDb(t.db.url, { max: 1 });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
  await fake.close();
});

describe('Telegram yuboruvchi (T-010, FR-RPT-6)', () => {
  it('xabar yuboriladi; bir xil dedupeKey — bitta xabar', async () => {
    await send('100', 'evt-1');
    await send('100', 'evt-1');
    await waitFor(() => hitsOf('100').length >= 1);
    await new Promise((r) => setTimeout(r, 500));
    expect(hitsOf('100')).toHaveLength(1);
  });

  it('429 retry_after — kutib qayta yuboriladi (urinish sanalmaydi), oxiri yetkaziladi', async () => {
    await send('flood');
    await waitFor(() => hitsOf('flood').length >= 2, 10_000);
    const [first, second] = hitsOf('flood');
    expect(second!.at - first!.at).toBeGreaterThanOrEqual(900);
  });

  it("bitta chatga sekundiga bittadan ko'p emas", async () => {
    await Promise.all([send('200'), send('200'), send('200')]);
    await waitFor(() => hitsOf('200').length >= 3, 10_000);
    const at = hitsOf('200').map((h) => h.at);
    expect(at[1]! - at[0]!).toBeGreaterThanOrEqual(900);
    expect(at[2]! - at[1]!).toBeGreaterThanOrEqual(900);
  });

  it('403 (bot bloklangan) — qayta urinilmaydi, TelegramChatBlocked event', async () => {
    await send('blocked');
    await waitFor(
      async () => (await db.$count(outboxEvents, eq(outboxEvents.type, 'TelegramChatBlocked'))) > 0,
    );
    await new Promise((r) => setTimeout(r, 1500));
    expect(hitsOf('blocked')).toHaveLength(1);
    const [ev] = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, 'TelegramChatBlocked'));
    expect(ev?.payload).toMatchObject({ chatId: 'blocked' });
  });

  it('400 — qayta urinilmaydi, dead-letter navbatiga', async () => {
    const id = await send('bad', 'bad-1');
    const dead = t.ctx.get(QueueService).queue(QUEUES.deadLetter);
    await waitFor(async () => (await dead.getJob(`telegram__${id}`)) !== undefined);
    expect(hitsOf('bad')).toHaveLength(1);
  });
});
