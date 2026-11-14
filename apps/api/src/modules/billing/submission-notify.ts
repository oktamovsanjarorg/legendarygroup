import { type Database, guardians, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import type { TelegramOutbox } from '../telegram/index.js';

/**
 * Chek natijasini ota-onaga botda bildirish (BR-13). `chatId` — ota-onaning Telegram ID'si
 * (avval `guardianId` UUID yuborilardi — xabar hech qachon yetmasdi). Bot'ga ulanmagan ota-ona —
 * xabarsiz (Mini App'da holat ko'rinadi).
 */
export async function notifyGuardian(
  db: Database,
  outbox: TelegramOutbox | undefined,
  input: { guardianId: string; text: string; dedupeKey: string },
): Promise<void> {
  if (!outbox) return;
  const [row] = await db
    .select({ telegramId: users.telegramId })
    .from(guardians)
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(eq(guardians.id, input.guardianId));
  if (!row?.telegramId) return;
  await outbox.enqueue(
    { method: 'sendMessage', chatId: row.telegramId.toString(), payload: { text: input.text } },
    { dedupeKey: input.dedupeKey },
  );
}
