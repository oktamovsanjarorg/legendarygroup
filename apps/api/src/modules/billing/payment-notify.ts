import { botMessages, formatMoney } from '@lg/i18n';
import { type Database, guardians, studentGuardians, students, users } from '@lg/db';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { TelegramOutbox } from '../telegram/index.js';

export interface PaymentReceiptNotice {
  paymentId: string;
  studentId: string;
  amount: bigint;
  receiptNumber: string;
  /** QR tekshiruv sahifasi (PII'siz, W-34). */
  verifyUrl: string;
}

/**
 * FR-PAY-2: to'lov saqlangach chek ota-onaga botda. Faqat `notify` yoqilgan va botga ulangan
 * ota-onalar (chatId — Telegram ID). Kalit to'lov + ota-ona bo'yicha: qayta chaqiruv — bitta xabar.
 */
export async function notifyPaymentReceipt(
  db: Database,
  outbox: TelegramOutbox | undefined,
  n: PaymentReceiptNotice,
): Promise<void> {
  if (!outbox) return;
  const rows = await db
    .select({ guardianId: guardians.id, telegramId: users.telegramId, student: students.fullName })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(
      and(
        eq(studentGuardians.studentId, n.studentId),
        eq(studentGuardians.notify, true),
        isNotNull(users.telegramId),
      ),
    );
  const m = botMessages.paymentReceipt;
  for (const r of rows) {
    const text = m.text
      .replace('{student}', r.student)
      .replace('{amount}', formatMoney(n.amount, { withCurrency: true }))
      .replace('{number}', n.receiptNumber);
    await outbox.enqueue(
      {
        method: 'sendMessage',
        chatId: String(r.telegramId),
        payload: {
          text,
          reply_markup: { inline_keyboard: [[{ text: m.verify, url: n.verifyUrl }]] },
        },
      },
      { dedupeKey: `payment-receipt:${n.paymentId}:${r.guardianId}` },
    );
  }
}
