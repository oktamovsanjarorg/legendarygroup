import { type AnyColumn, type SQL, sql } from 'drizzle-orm';

/**
 * Billing'ning yagona "to'langan" ta'rifi (BR-12, FR-PAY-9): storno qilingan to'lovning
 * taqsimoti hisobga olinmaydi. Qarz/holat hisoblaydigan har so'rov shu ifodalardan foydalanadi —
 * `invoices.total`ni qarz deb olish taqiqlangan (to'lovlar hisobga olinmaydi).
 */
const effective = sql.raw(
  'NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = pa.payment_id)',
);

/** Qatorga samarali taqsimlangan summa (bigint matn emas — `numeric`). */
export function lineAllocatedSql(lineId: AnyColumn | SQL): SQL<string> {
  return sql<string>`(SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
    WHERE pa.invoice_line_id = ${lineId} AND ${effective})`;
}

/** Invoice bo'yicha samarali to'langan summa. */
export function invoicePaidSql(invoiceId: AnyColumn | SQL): SQL<string> {
  return sql<string>`(SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
    JOIN invoice_lines il ON il.id = pa.invoice_line_id
    WHERE il.invoice_id = ${invoiceId} AND ${effective})`;
}

/** Invoice qoldig'i (manfiy bo'lmaydi). */
export function invoiceOutstandingSql(
  invoiceId: AnyColumn | SQL,
  total: AnyColumn | SQL,
): SQL<string> {
  return sql<string>`greatest(${total} - ${invoicePaidSql(invoiceId)}, 0)`;
}
