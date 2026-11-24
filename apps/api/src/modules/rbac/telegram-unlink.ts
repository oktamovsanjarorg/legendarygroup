import { sessions, type Transaction, users } from '@lg/db';
import { and, eq, isNull } from 'drizzle-orm';
import { bumpPermissionsVersion } from './user-version.js';

/**
 * Telegram bog'lanishini uzish (Q-98): web sessiyalar yopiladi, Mini App tokenlari keyingi
 * so'rovda yaroqsiz (`permissions_version`). Qayta ulanish — botda raqamni ulashish.
 * Audit — chaqiruvchida (kim uzgani faqat unga ma'lum).
 */
export async function unlinkTelegram(tx: Transaction, userId: string, now: Date): Promise<void> {
  await tx
    .update(users)
    .set({ telegramId: null, telegramUsername: null })
    .where(eq(users.id, userId));
  await tx
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  await bumpPermissionsVersion(tx, userId);
}
