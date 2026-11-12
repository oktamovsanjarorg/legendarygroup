import { type Transaction, users } from '@lg/db';
import { eq, sql } from 'drizzle-orm';

/**
 * `permissions_version + 1` (02 §1): ruxsat/rol/holat o'zgarsa, eski tokenlar keyingi so'rovda
 * yaroqsiz bo'ladi. Faqat tranzaksiya ichida — o'zgarish bilan birga.
 */
export async function bumpPermissionsVersion(tx: Transaction, userId: string): Promise<void> {
  await tx
    .update(users)
    .set({ permissionsVersion: sql`${users.permissionsVersion} + 1` })
    .where(eq(users.id, userId));
}
