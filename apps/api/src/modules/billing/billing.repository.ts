import { Inject, Injectable } from '@nestjs/common';
import type { InvoiceListQueryInput, LedgerListQueryInput } from '@lg/contracts';
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
  type Transaction,
} from '@lg/db';
import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface ActiveEnrollmentInfo {
  enrollmentId: string;
  studentId: string;
  groupId: string;
  startDate: string;
  endDate: string | null;
  discountPercent: number | null;
  monthlyPrice: bigint;
  groupName: string;
}

@Injectable()
export class BillingRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findInvoices(filter: InvoiceListQueryInput, studentIds?: string[]): Promise<InvoiceRow[]> {
    const conditions = [];
    if (filter.period) conditions.push(eq(invoices.period, filter.period));
    if (filter.studentId) conditions.push(eq(invoices.studentId, filter.studentId));
    if (filter.status) conditions.push(eq(invoices.status, filter.status));
    if (studentIds && studentIds.length > 0) {
      conditions.push(inArray(invoices.studentId, studentIds));
    }
    if (filter.cursor) {
      conditions.push(sql`${invoices.createdAt} < ${filter.cursor}`);
    }

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
    if (filter.cursor) {
      conditions.push(sql`${ledgerEntries.occurredAt} < ${filter.cursor}`);
    }

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
    const rows = await this.db
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

    return rows;
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
}
