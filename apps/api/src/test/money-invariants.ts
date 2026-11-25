import type { Database } from '@lg/db';
import { sql } from 'drizzle-orm';
import { expect } from 'vitest';

/**
 * T-165: butun DB bo'yicha pul invariantlari (har billing int testi oxirida). Har so'rov buzilgan
 * o'quvchilarni qaytaradi — bo'sh bo'lishi shart.
 */
const EFFECTIVE = sql`NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = pa.payment_id)`;

const CHECKS = {
  /** Hisob summasi = qatorlar yig'indisi (bekor qilinmagan hisoblarda). */
  invoiceTotal: sql`
    SELECT i.student_id AS id FROM invoices i
    WHERE i.status <> 'void'
      AND i.total <> greatest((SELECT coalesce(sum(il.amount), 0) FROM invoice_lines il
                               WHERE il.invoice_id = i.id), 0)`,
  /** Kassa yozuvlari ledgerda aynan bir marta: ledger(to'lov+storno+refund) = −Σ payments. */
  cashLedger: sql`
    SELECT s.id FROM students s
    WHERE (SELECT coalesce(sum(le.amount), 0) FROM ledger_entries le
           WHERE le.student_id = s.id AND le.entry_type IN ('payment', 'reversal', 'refund'))
       <> -(SELECT coalesce(sum(p.amount), 0) FROM payments p WHERE p.student_id = s.id)`,
  /** Balans = hisoblangan − to'langan: ledger yig'indisi hisoblar va kassadan chiqadi. */
  balance: sql`
    SELECT s.id FROM students s
    WHERE (SELECT coalesce(sum(le.amount), 0) FROM ledger_entries le WHERE le.student_id = s.id)
       <> (SELECT coalesce(sum(i.total), 0) FROM invoices i
           WHERE i.student_id = s.id AND i.status <> 'void')
        - (SELECT coalesce(sum(p.amount), 0) FROM payments p WHERE p.student_id = s.id)`,
  /** Qatorga taqsimot qator summasidan oshmaydi; manfiy/bekor qilingan qatorga taqsimot yo'q. */
  lineOver: sql`
    SELECT i.student_id AS id FROM invoice_lines il JOIN invoices i ON i.id = il.invoice_id
    WHERE (SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
           WHERE pa.invoice_line_id = il.id AND ${EFFECTIVE})
        > CASE WHEN i.status = 'void' THEN 0 ELSE greatest(il.amount, 0) END`,
  /** To'lov taqsimoti to'lov summasidan oshmaydi. */
  paymentOver: sql`
    SELECT p.student_id AS id FROM payments p
    WHERE (SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
           WHERE pa.payment_id = p.id) > greatest(p.amount, 0)`,
  /** Avans manfiy emas: samarali taqsimot + refund ≤ samarali to'lovlar. */
  advance: sql`
    SELECT s.id FROM students s
    WHERE (SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
           JOIN payments p ON p.id = pa.payment_id WHERE p.student_id = s.id AND ${EFFECTIVE})
        - (SELECT coalesce(sum(f.amount), 0) FROM payments f
           WHERE f.student_id = s.id AND f.amount < 0 AND f.reversal_of IS NULL)
        > (SELECT coalesce(sum(p.amount), 0) FROM payments p
           WHERE p.student_id = s.id AND p.amount > 0
             AND NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = p.id))`,
  /** Qarz bor ekan avans ishlatilmay turmaydi (avans ochiq qatorga qo'llanishi shart). */
  idleAdvance: sql`
    SELECT s.id FROM students s
    WHERE EXISTS (SELECT 1 FROM invoice_lines il JOIN invoices i ON i.id = il.invoice_id
                  WHERE i.student_id = s.id AND i.status <> 'void' AND il.amount >
                    (SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
                     WHERE pa.invoice_line_id = il.id AND ${EFFECTIVE}))
      AND (SELECT coalesce(sum(p.amount), 0) FROM payments p
           WHERE p.student_id = s.id AND p.amount > 0
             AND NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = p.id))
        + (SELECT coalesce(sum(f.amount), 0) FROM payments f
           WHERE f.student_id = s.id AND f.amount < 0 AND f.reversal_of IS NULL)
        > (SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
           JOIN payments p ON p.id = pa.payment_id WHERE p.student_id = s.id AND ${EFFECTIVE})`,
  /** Hisob holati samarali to'langan summaga mos. */
  status: sql`
    SELECT i.student_id AS id FROM invoices i
    CROSS JOIN LATERAL (SELECT coalesce(sum(pa.amount), 0) AS paid FROM payment_allocations pa
      JOIN invoice_lines il ON il.id = pa.invoice_line_id
      WHERE il.invoice_id = i.id AND ${EFFECTIVE}) x
    WHERE i.status <> 'void' AND i.status <> CASE WHEN x.paid >= i.total THEN 'paid'
      WHEN x.paid > 0 THEN 'partially_paid' ELSE 'open' END`,
} as const;

export async function expectMoneyInvariants(db: Database): Promise<void> {
  const broken: Record<string, string[]> = {};
  for (const [name, q] of Object.entries(CHECKS)) {
    const rows = await db.execute<{ id: string }>(q);
    if (rows.length > 0) broken[name] = [...new Set(rows.map((r) => r.id))];
  }
  expect(broken).toEqual({});
}
