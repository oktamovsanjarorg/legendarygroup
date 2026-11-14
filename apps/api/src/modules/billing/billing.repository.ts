import { Inject, Injectable } from '@nestjs/common';
import type {
  InvoiceListQueryInput,
  LedgerListQueryInput,
  PaymentListQueryInput,
} from '@lg/contracts';
import {
  type Database,
  enrollments,
  groups,
  invoiceLines,
  type InvoiceLineRow,
  type InvoiceRow,
  invoices,
  ledgerEntries,
  type LedgerEntryRow,
  lessons,
  type NewInvoiceLineRow,
  type NewInvoiceRow,
  type NewLedgerEntryRow,
  type NewPaymentRow,
  paymentAllocations,
  payments,
  type PaymentRow,
  receiptCancellations,
  receiptCounters,
  receipts,
  type ReceiptRow,
  type Transaction,
} from '@lg/db';
import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { ActiveEnrollmentInfo, OpenLineInfo } from './billing.types.js';

@Injectable()
export class BillingRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findInvoices(filter: InvoiceListQueryInput, studentIds?: string[]): Promise<InvoiceRow[]> {
    const conditions = [];
    if (filter.period) conditions.push(eq(invoices.period, filter.period));
    if (filter.studentId) conditions.push(eq(invoices.studentId, filter.studentId));
    if (filter.status) conditions.push(eq(invoices.status, filter.status));
    if (studentIds && studentIds.length > 0)
      conditions.push(inArray(invoices.studentId, studentIds));
    if (filter.cursor) conditions.push(sql`${invoices.createdAt} < ${filter.cursor}`);

    return this.db
      .select()
      .from(invoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(invoices.createdAt), desc(invoices.id))
      .limit(filter.limit);
  }

  async findInvoiceById(id: string): Promise<InvoiceRow | null> {
    const [row] = await this.db.select().from(invoices).where(eq(invoices.id, id));
    return row ?? null;
  }

  async findInvoiceLines(invoiceId: string): Promise<InvoiceLineRow[]> {
    return this.db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId))
      .orderBy(invoiceLines.createdAt);
  }

  async findInvoiceByStudentAndPeriod(
    tx: Transaction | Database,
    studentId: string,
    period: string,
  ): Promise<InvoiceRow | null> {
    const [row] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.studentId, studentId), eq(invoices.period, period)));
    return row ?? null;
  }

  async findStudentLedger(
    studentId: string,
    filter: LedgerListQueryInput,
  ): Promise<LedgerEntryRow[]> {
    const conditions = [eq(ledgerEntries.studentId, studentId)];
    if (filter.entryType) conditions.push(eq(ledgerEntries.entryType, filter.entryType));
    if (filter.cursor) conditions.push(sql`${ledgerEntries.occurredAt} < ${filter.cursor}`);

    return this.db
      .select()
      .from(ledgerEntries)
      .where(and(...conditions))
      .orderBy(desc(ledgerEntries.occurredAt), desc(ledgerEntries.id))
      .limit(filter.limit);
  }

  async calculateStudentLedgerTotal(studentId: string): Promise<bigint> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)` })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.studentId, studentId));
    return BigInt(row?.total ?? '0');
  }

  async findActiveEnrollmentsForMonth(
    monthStart: string,
    monthEnd: string,
  ): Promise<ActiveEnrollmentInfo[]> {
    return this.db
      .select({
        enrollmentId: enrollments.id,
        studentId: enrollments.studentId,
        groupId: enrollments.groupId,
        startDate: enrollments.startDate,
        endDate: enrollments.endDate,
        discountPercent: enrollments.discountPercent,
        monthlyPrice: groups.monthlyPrice,
        groupName: groups.name,
      })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          lte(enrollments.startDate, monthEnd),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, monthStart)),
        ),
      );
  }

  async countPlannedLessons(groupId: string, fromDate: string, toDate: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(
        and(
          eq(lessons.groupId, groupId),
          gte(lessons.date, fromDate),
          lte(lessons.date, toDate),
          ne(lessons.status, 'cancelled'),
        ),
      );
    return row?.count ?? 0;
  }

  async insertInvoice(tx: Transaction, row: NewInvoiceRow): Promise<InvoiceRow> {
    const [created] = await tx.insert(invoices).values(row).returning();
    if (!created) throw new Error('INVOICE_CREATE_FAILED');
    return created;
  }

  async insertInvoiceLines(tx: Transaction, lines: NewInvoiceLineRow[]): Promise<InvoiceLineRow[]> {
    if (lines.length === 0) return [];
    return tx.insert(invoiceLines).values(lines).returning();
  }

  async insertLedgerEntries(tx: Transaction, entries: NewLedgerEntryRow[]): Promise<void> {
    if (entries.length === 0) return;
    await tx.insert(ledgerEntries).values(entries);
  }

  async findOpenInvoiceLinesForStudent(
    tx: Transaction,
    studentId: string,
  ): Promise<OpenLineInfo[]> {
    const rows = await tx
      .select({
        id: invoiceLines.id,
        invoiceId: invoiceLines.invoiceId,
        dueDate: invoices.dueDate,
        amount: invoiceLines.amount,
        allocated: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .leftJoin(paymentAllocations, eq(paymentAllocations.invoiceLineId, invoiceLines.id))
      .where(and(eq(invoices.studentId, studentId), ne(invoices.status, 'void')))
      .groupBy(invoiceLines.id, invoiceLines.invoiceId, invoices.dueDate, invoiceLines.amount)
      .orderBy(invoices.dueDate, invoiceLines.id);

    return rows
      .map((r) => {
        const allocated = BigInt(r.allocated);
        const outstanding = r.amount > allocated ? r.amount - allocated : 0n;
        return {
          id: r.id,
          invoiceId: r.invoiceId,
          dueDate: r.dueDate,
          amount: r.amount,
          allocated,
          outstanding,
        };
      })
      .filter((l) => l.outstanding > 0n);
  }

  async insertPayment(tx: Transaction, row: NewPaymentRow): Promise<PaymentRow> {
    const [created] = await tx.insert(payments).values(row).returning();
    if (!created) throw new Error('PAYMENT_CREATE_FAILED');
    return created;
  }

  async insertPaymentAllocations(
    tx: Transaction,
    allocs: { paymentId: string; invoiceLineId: string; amount: bigint }[],
  ): Promise<void> {
    if (allocs.length === 0) return;
    await tx.insert(paymentAllocations).values(allocs);
  }

  async updateInvoiceStatus(
    tx: Transaction,
    invoiceId: string,
    status: 'open' | 'paid' | 'partially_paid' | 'void',
  ): Promise<void> {
    await tx.update(invoices).set({ status }).where(eq(invoices.id, invoiceId));
  }

  async getNextReceiptNumber(tx: Transaction, year: number): Promise<string> {
    const [row] = await tx
      .insert(receiptCounters)
      .values({ year, last: 1 })
      .onConflictDoUpdate({
        target: receiptCounters.year,
        set: { last: sql`${receiptCounters.last} + 1` },
      })
      .returning({ last: receiptCounters.last });

    const num = row?.last ?? 1;
    return `LG-${year}-${String(num).padStart(6, '0')}`;
  }

  async insertReceipt(
    tx: Transaction,
    row: { id?: string; number: string; paymentId: string; verifyToken: string },
  ): Promise<ReceiptRow> {
    const [created] = await tx.insert(receipts).values(row).returning();
    if (!created) throw new Error('RECEIPT_CREATE_FAILED');
    return created;
  }

  async findReceiptByPaymentId(paymentId: string): Promise<ReceiptRow | null> {
    const [row] = await this.db.select().from(receipts).where(eq(receipts.paymentId, paymentId));
    return row ?? null;
  }

  async findReceiptByNumber(number: string): Promise<ReceiptRow | null> {
    const [row] = await this.db.select().from(receipts).where(eq(receipts.number, number));
    return row ?? null;
  }

  async findReceiptByVerifyToken(verifyToken: string): Promise<ReceiptRow | null> {
    const [row] = await this.db
      .select()
      .from(receipts)
      .where(eq(receipts.verifyToken, verifyToken));
    return row ?? null;
  }

  async isReceiptCancelled(
    receiptId: string,
  ): Promise<{ isCancelled: boolean; reason: string | null }> {
    const [row] = await this.db
      .select({ reason: receiptCancellations.reason })
      .from(receiptCancellations)
      .where(eq(receiptCancellations.receiptId, receiptId));
    return { isCancelled: !!row, reason: row?.reason ?? null };
  }

  async findPayments(filter: PaymentListQueryInput): Promise<PaymentRow[]> {
    const conditions = [];
    if (filter.studentId) conditions.push(eq(payments.studentId, filter.studentId));
    if (filter.method) conditions.push(eq(payments.method, filter.method));
    if (filter.cursor) conditions.push(sql`${payments.paidAt} < ${filter.cursor}`);

    return this.db
      .select()
      .from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.paidAt), desc(payments.id))
      .limit(filter.limit);
  }

  async findPaymentById(id: string): Promise<PaymentRow | null> {
    const [row] = await this.db.select().from(payments).where(eq(payments.id, id));
    return row ?? null;
  }

  async findAllocationsByPaymentId(
    paymentId: string,
  ): Promise<{ invoiceLineId: string; amount: bigint }[]> {
    return this.db
      .select({
        invoiceLineId: paymentAllocations.invoiceLineId,
        amount: paymentAllocations.amount,
      })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId));
  }
}
