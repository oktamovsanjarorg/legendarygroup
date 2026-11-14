import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  enrollments,
  type EnrollmentRow,
  invoiceLines,
  type InvoiceLineRow,
  invoices,
  type InvoiceRow,
  ledgerEntries,
  type NewLedgerEntryRow,
  type Transaction,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

@Injectable()
export class DiscountsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findEnrollmentById(id: string): Promise<EnrollmentRow | null> {
    const [row] = await this.db.select().from(enrollments).where(eq(enrollments.id, id)).limit(1);
    return row ?? null;
  }

  async updateEnrollmentDiscount(
    id: string,
    percent: number,
    tx?: Transaction,
  ): Promise<EnrollmentRow | null> {
    const client = tx ?? this.db;
    const [row] = await client
      .update(enrollments)
      .set({ discountPercent: percent })
      .where(eq(enrollments.id, id))
      .returning();
    return row ?? null;
  }

  async findInvoiceById(id: string): Promise<InvoiceRow | null> {
    const [row] = await this.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return row ?? null;
  }

  async findInvoiceLineById(id: string): Promise<InvoiceLineRow | null> {
    const [row] = await this.db.select().from(invoiceLines).where(eq(invoiceLines.id, id)).limit(1);
    return row ?? null;
  }

  async findInvoiceLines(invoiceId: string, tx?: Transaction): Promise<InvoiceLineRow[]> {
    const client = tx ?? this.db;
    return client.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
  }

  async deleteInvoiceLine(id: string, tx?: Transaction): Promise<boolean> {
    const client = tx ?? this.db;
    const res = await client.delete(invoiceLines).where(eq(invoiceLines.id, id)).returning();
    return res.length > 0;
  }

  async updateInvoiceTotal(
    id: string,
    newTotal: bigint,
    tx?: Transaction,
  ): Promise<InvoiceRow | null> {
    const client = tx ?? this.db;
    const [row] = await client
      .update(invoices)
      .set({ total: newTotal })
      .where(eq(invoices.id, id))
      .returning();
    return row ?? null;
  }

  async insertLedgerEntry(entry: NewLedgerEntryRow, tx?: Transaction): Promise<void> {
    const client = tx ?? this.db;
    await client.insert(ledgerEntries).values(entry);
  }
}
