import type {
  Invoice,
  InvoiceLine,
  InvoiceWithLines,
  LedgerEntry,
  StudentLedgerSummary,
} from '@lg/contracts';
import type { InvoiceLineRow, InvoiceRow, LedgerEntryRow } from '@lg/db';
import { isDebtCritical } from '@lg/domain';

export function serializeInvoiceLine(row: InvoiceLineRow): InvoiceLine {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    enrollmentId: row.enrollmentId,
    kind: row.kind,
    amount: row.amount.toString(),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeInvoice(
  row: InvoiceRow,
  lines?: InvoiceLineRow[],
): Invoice | InvoiceWithLines {
  const base: Invoice = {
    id: row.id,
    branchId: row.branchId,
    studentId: row.studentId,
    period: row.period,
    dueDate: row.dueDate,
    total: row.total.toString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  if (lines) {
    return {
      ...base,
      lines: lines.map(serializeInvoiceLine),
    };
  }

  return base;
}

export function serializeLedgerEntry(row: LedgerEntryRow): LedgerEntry {
  return {
    id: row.id,
    branchId: row.branchId,
    studentId: row.studentId,
    entryType: row.entryType,
    amount: row.amount.toString(),
    refTable: row.refTable,
    refId: row.refId,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeStudentLedgerSummary(
  studentId: string,
  totalLedger: bigint,
  monthlyPrice = 0n,
  daysOverdue = 0,
): StudentLedgerSummary {
  const debt = totalLedger > 0n ? totalLedger : 0n;
  const advance = totalLedger < 0n ? -totalLedger : 0n;
  const balance = -totalLedger;
  const critical =
    monthlyPrice > 0n ? isDebtCritical({ debt, monthlyPrice, overdueDays: daysOverdue }) : false;

  return {
    studentId,
    balance: balance.toString(),
    totalDebt: debt.toString(),
    totalAdvance: advance.toString(),
    isCritical: critical,
  };
}
