import { closeDb, createDb, type Database, guardians, users } from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TelegramMessage, TelegramOutbox } from '../telegram/index.js';
import { notifyGuardian } from './submission-notify.js';
import { expectMoneyInvariants } from '../../test/money-invariants.js';

let tmp: TempDb;
let db: Database;

beforeAll(async () => {
  tmp = await createTempDb();
  db = createDb(tmp.url, { max: 2 });
});
afterAll(async () => {
  await expectMoneyInvariants(db);
  await closeDb(db);
  await tmp.drop();
});

describe('BR-13: chek natijasi ota-onaga (Telegram ID, UUID emas)', () => {
  it('botga ulangan — telegram_id’ga; ulanmagan — xabarsiz', async () => {
    const sent: TelegramMessage[] = [];
    const outbox = {
      enqueue: async (m: TelegramMessage) => (sent.push(m), 'j'),
    } as unknown as TelegramOutbox;
    const [u] = await db
      .insert(users)
      .values({ fullName: 'Ona', phone: '+998901110001', telegramId: 555n })
      .returning();
    const [linked] = await db
      .insert(guardians)
      .values({ fullName: 'Ona', phone: '+998901110001', userId: u!.id })
      .returning();
    const [unlinked] = await db
      .insert(guardians)
      .values({ fullName: 'Ota', phone: '+998901110002' })
      .returning();

    await notifyGuardian(db, outbox, { guardianId: linked!.id, text: 'ok', dedupeKey: 'k1' });
    await notifyGuardian(db, outbox, { guardianId: unlinked!.id, text: 'ok', dedupeKey: 'k2' });
    expect(sent.map((m) => m.chatId)).toEqual(['555']);
  });
});
