import { type Database, payments } from '@lg/db';
import { eq, sql } from 'drizzle-orm';

/** Test uchun: to'lov "kecha kiritilgan" (BR-16). Jadval o'zgarmas — trigger faqat shu yerda o'chadi. */
export async function backdatePayment(db: Database, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE payments DISABLE TRIGGER USER`);
    await tx
      .update(payments)
      .set({ createdAt: new Date(Date.now() - 86_400_000) })
      .where(eq(payments.id, id));
    await tx.execute(sql`ALTER TABLE payments ENABLE TRIGGER USER`);
  });
}
