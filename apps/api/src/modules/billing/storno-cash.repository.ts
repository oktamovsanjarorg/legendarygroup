import { Inject, Injectable } from '@nestjs/common';
import { tashkentDayRange } from '@lg/domain';
import type { CashClosingListQueryInput } from '@lg/contracts';
import {
  cashClosings,
  type CashClosingRow,
  type Database,
  ledgerEntries,
  type NewCashClosingRow,
  type NewLedgerEntryRow,
  type NewPaymentRow,
  payments,
  type PaymentRow,
  receiptCancellations,
  receipts,
  type ReceiptRow,
  type Transaction,
  users,
} from '@lg/db';
import { and, desc, eq, gte, lt, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface CashClosingWithUser extends CashClosingRow {
  closedByName: string | null;
}

@Injectable()
export class StornoCashRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findPaymentById(id: string): Promise<PaymentRow | null> {
    const [row] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return row ?? null;
  }

  async findReceiptByPaymentId(paymentId: string): Promise<ReceiptRow | null> {
    const [row] = await this.db
      .select()
      .from(receipts)
      .where(eq(receipts.paymentId, paymentId))
      .limit(1);
    return row ?? null;
  }

  async isReceiptCancelled(receiptId: string): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(receiptCancellations)
      .where(eq(receiptCancellations.receiptId, receiptId))
      .limit(1);
    return !!row;
  }

  async insertReceiptCancellation(
    data: { receiptId: string; reversalPaymentId: string; reason: string; createdBy?: string },
    tx?: Transaction,
  ): Promise<void> {
    const client = tx ?? this.db;
    await client.insert(receiptCancellations).values({
      receiptId: data.receiptId,
      reversalPaymentId: data.reversalPaymentId,
      reason: data.reason,
      createdBy: data.createdBy ?? null,
    });
  }

  async insertPayment(data: NewPaymentRow, tx?: Transaction): Promise<PaymentRow> {
    const client = tx ?? this.db;
    const [row] = await client.insert(payments).values(data).returning();
    if (!row) throw new Error('INSERT_PAYMENT_FAILED');
    return row;
  }

  async findReversalOf(paymentId: string, tx: Transaction): Promise<PaymentRow | undefined> {
    const [row] = await tx.select().from(payments).where(eq(payments.reversalOf, paymentId));
    return row;
  }

  async insertLedgerEntry(entry: NewLedgerEntryRow, tx?: Transaction): Promise<void> {
    const client = tx ?? this.db;
    await client.insert(ledgerEntries).values(entry);
  }

  async sumCashPaymentsForDate(dateStr: string, branchId: string): Promise<bigint> {
    const { start, end } = tashkentDayRange(dateStr);

    const rows = await this.db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.branchId, branchId),
          eq(payments.method, 'cash'),
          gte(payments.paidAt, start),
          lt(payments.paidAt, end),
        ),
      );

    let total = 0n;
    for (const r of rows) {
      total += r.amount;
    }
    return total;
  }

  async findCashClosingByDate(dateStr: string, branchId: string): Promise<CashClosingRow | null> {
    const [row] = await this.db
      .select()
      .from(cashClosings)
      .where(and(eq(cashClosings.branchId, branchId), eq(cashClosings.date, dateStr)))
      .limit(1);
    return row ?? null;
  }

  async insertCashClosing(data: NewCashClosingRow, tx?: Transaction): Promise<CashClosingRow> {
    const client = tx ?? this.db;
    const [row] = await client.insert(cashClosings).values(data).returning();
    if (!row) throw new Error('INSERT_CASH_CLOSING_FAILED');
    return row;
  }

  async findCashClosings(
    filter: CashClosingListQueryInput,
    branchId: string,
  ): Promise<CashClosingWithUser[]> {
    const conditions = [eq(cashClosings.branchId, branchId)];
    if (filter.from) conditions.push(gte(cashClosings.date, filter.from));
    if (filter.to) conditions.push(lte(cashClosings.date, filter.to));
    if (filter.cursor) conditions.push(sql`${cashClosings.createdAt} < ${filter.cursor}`);

    const rows = await this.db
      .select({
        closing: cashClosings,
        closedByName: users.fullName,
      })
      .from(cashClosings)
      .leftJoin(users, eq(cashClosings.closedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(cashClosings.date))
      .limit(filter.limit);

    return rows.map((r) => ({
      ...r.closing,
      closedByName: r.closedByName,
    }));
  }
}
