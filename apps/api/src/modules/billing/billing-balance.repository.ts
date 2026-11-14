import { Injectable } from '@nestjs/common';
import {
  invoiceLines,
  invoicePaidSql,
  invoices,
  lineAllocatedSql,
  paymentAllocations,
  type Transaction,
} from '@lg/db';
import { allocateFifo } from '@lg/domain';
import { and, eq, ne, sql } from 'drizzle-orm';
import type { OpenLineInfo } from './billing.types.js';

interface AvailablePayment {
  id: string;
  remaining: bigint;
}

/**
 * O'quvchi balansining yaxlitligi (BR-12, FR-PAY-9). Har pul amali (to'lov, storno, refund,
 * chek tasdiqlash, invoice yaratish, jarima bekor qilish) shu tranzaksiya ichida:
 * `lockStudent` → amal → `applyAdvance` → `refreshInvoiceStatuses`.
 */
@Injectable()
export class BillingBalanceRepository {
  /** O'quvchi bo'yicha pul amallarini ketma-ket qiladi (parallel to'lov ortiqcha taqsimlamasin). */
  async lockStudent(tx: Transaction, studentId: string): Promise<void> {
    await tx.execute(sql`SELECT id FROM students WHERE id = ${studentId} FOR UPDATE`);
  }

  /** Qoldig'i bor qatorlar, eng eski muddatdan (storno qilingan taqsimot hisobga olinmaydi). */
  async openLines(tx: Transaction, studentId: string): Promise<OpenLineInfo[]> {
    const rows = await tx
      .select({
        id: invoiceLines.id,
        invoiceId: invoiceLines.invoiceId,
        dueDate: invoices.dueDate,
        amount: invoiceLines.amount,
        allocated: lineAllocatedSql(invoiceLines.id),
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(and(eq(invoices.studentId, studentId), ne(invoices.status, 'void')))
      .orderBy(invoices.dueDate, invoiceLines.id);
    return rows
      .map((r) => {
        const allocated = BigInt(r.allocated);
        const outstanding = r.amount > allocated ? r.amount - allocated : 0n;
        return { ...r, allocated, outstanding };
      })
      .filter((l) => l.outstanding > 0n);
  }

  /**
   * Avans (taqsimlanmagan to'lov qoldig'i) ochiq qatorlarga FIFO qo'llanadi. Refund qilingan
   * summa avval eng eski to'lovlar qoldig'idan ayriladi. Qaytaradi: qo'llangan summa.
   */
  async applyAdvance(tx: Transaction, studentId: string): Promise<bigint> {
    let lines = await this.openLines(tx, studentId);
    if (lines.length === 0) return 0n;
    let applied = 0n;
    for (const p of await this.availablePayments(tx, studentId)) {
      const res = allocateFifo(
        p.remaining,
        lines.map((l) => ({ id: l.id, dueDate: l.dueDate, outstanding: l.outstanding })),
      );
      for (const part of res.parts) {
        await tx
          .insert(paymentAllocations)
          .values({ paymentId: p.id, invoiceLineId: part.id, amount: part.amount })
          .onConflictDoUpdate({
            target: [paymentAllocations.paymentId, paymentAllocations.invoiceLineId],
            set: { amount: sql`${paymentAllocations.amount} + excluded.amount` },
          });
        applied += part.amount;
      }
      const used = new Map(res.parts.map((x) => [x.id, x.amount]));
      lines = lines
        .map((l) => ({ ...l, outstanding: l.outstanding - (used.get(l.id) ?? 0n) }))
        .filter((l) => l.outstanding > 0n);
      if (lines.length === 0) break;
    }
    return applied;
  }

  /** Mavjud avans jami (refund chegarasi uchun). */
  async availableAdvance(tx: Transaction, studentId: string): Promise<bigint> {
    const list = await this.availablePayments(tx, studentId);
    return list.reduce((sum, p) => sum + p.remaining, 0n);
  }

  /** Invoice holati faqat samarali taqsimotdan (void o'zgarmaydi). */
  async refreshInvoiceStatuses(tx: Transaction, studentId: string): Promise<void> {
    const paid = invoicePaidSql(invoices.id);
    await tx
      .update(invoices)
      .set({
        status: sql`CASE WHEN ${paid} >= ${invoices.total} THEN 'paid'
          WHEN ${paid} > 0 THEN 'partially_paid' ELSE 'open' END`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(invoices.studentId, studentId), ne(invoices.status, 'void')));
  }

  private async availablePayments(tx: Transaction, studentId: string) {
    const rows = await tx.execute<{ id: string; remaining: string; refunded: string }>(sql`
      SELECT p.id,
        (p.amount - coalesce((SELECT sum(pa.amount) FROM payment_allocations pa
                              WHERE pa.payment_id = p.id), 0))::text AS remaining,
        (SELECT coalesce(-sum(f.amount), 0) FROM payments f
          WHERE f.student_id = ${studentId} AND f.amount < 0 AND f.reversal_of IS NULL)::text AS refunded
      FROM payments p
      WHERE p.student_id = ${studentId} AND p.amount > 0
        AND NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = p.id)
      ORDER BY p.paid_at, p.id
    `);
    let refundLeft = BigInt(rows[0]?.refunded ?? '0');
    const out: AvailablePayment[] = [];
    for (const r of rows) {
      let remaining = BigInt(r.remaining);
      const take = remaining < refundLeft ? remaining : refundLeft;
      remaining -= take;
      refundLeft -= take;
      if (remaining > 0n) out.push({ id: r.id, remaining });
    }
    return out;
  }
}
