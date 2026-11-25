import {
  closeDb,
  createDb,
  type Database,
  guardians,
  studentGuardians,
  students,
  users,
} from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TelegramMessage, TelegramOutbox } from '../telegram/index.js';
import { notifyPaymentReceipt } from './payment-notify.js';
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

const guardian = async (phone: string, telegramId: bigint | null) => {
  const [u] = await db.insert(users).values({ fullName: 'G', phone, telegramId }).returning();
  const [g] = await db
    .insert(guardians)
    .values({ fullName: 'G', phone, userId: u!.id })
    .returning();
  return g!.id;
};

describe('FR-PAY-2: kassa toʻlovi cheki ota-onaga botda', () => {
  it('notify yoqilgan va botga ulanganlarga — Telegram ID’ga, tekshiruv tugmasi bilan', async () => {
    const sent: { m: TelegramMessage; key?: string }[] = [];
    const outbox = {
      enqueue: async (m: TelegramMessage, o: { dedupeKey?: string }) => (
        sent.push({ m, key: o.dedupeKey }),
        'j'
      ),
    } as unknown as TelegramOutbox;
    const [st] = await db
      .insert(students)
      .values({ fullName: 'Ali Valiyev', searchName: 'ali valiyev' })
      .returning();
    const mother = await guardian('+998901110001', 555n);
    const father = await guardian('+998901110002', 777n);
    const unlinked = await guardian('+998901110003', null);
    await db.insert(studentGuardians).values([
      { studentId: st!.id, guardianId: mother, relation: 'mother', isPrimary: true },
      { studentId: st!.id, guardianId: father, relation: 'father', notify: false },
      { studentId: st!.id, guardianId: unlinked, relation: 'other' },
    ]);

    await notifyPaymentReceipt(db, outbox, {
      paymentId: 'p1',
      studentId: st!.id,
      amount: 650_000n,
      receiptNumber: 'LG-2026-000001',
      verifyUrl: 'https://app.lg.uz/verify/tok',
    });
    expect(sent.map((s) => s.m.chatId)).toEqual(['555']);
    const payload = sent[0]!.m.payload as { text: string; reply_markup: unknown };
    expect(payload.text).toContain('LG-2026-000001');
    expect(payload.text).toContain('Ali Valiyev');
    expect(JSON.stringify(payload.reply_markup)).toContain('https://app.lg.uz/verify/tok');
    expect(sent[0]!.key).toBe(`payment-receipt:p1:${mother}`);
  });
});
