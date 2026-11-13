import {
  INVOICE_LINE_KINDS,
  INVOICE_STATUSES,
  LEDGER_ENTRY_TYPES,
  PAYMENT_METHODS,
  PAYMENT_SUBMISSION_STATUSES,
} from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';
import { enrollments } from './enrollments.js';
import { branchId } from './org.js';
import { guardians, students } from './students.js';
import { files } from './system.js';
import { users } from './users.js';

export const invoices = pgTable(
  'invoices',
  {
    id: primaryUuid(),
    branchId: branchId(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    period: text('period').notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    total: bigint('total', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    status: text('status', { enum: INVOICE_STATUSES }).notNull().default('open'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('invoices_student_period_uq').on(t.studentId, t.period),
    index('invoices_branch_id_idx').on(t.branchId),
    index('invoices_student_id_idx').on(t.studentId),
    index('invoices_period_idx').on(t.period),
    index('invoices_status_idx').on(t.status),
    check('invoices_status_check', oneOf(t.status, INVOICE_STATUSES)),
    check('invoices_total_check', sql`${t.total} >= 0`),
  ],
);

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: primaryUuid(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: INVOICE_LINE_KINDS }).notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    description: text('description').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('invoice_lines_invoice_id_idx').on(t.invoiceId),
    index('invoice_lines_enrollment_id_idx').on(t.enrollmentId),
    check('invoice_lines_kind_check', oneOf(t.kind, INVOICE_LINE_KINDS)),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: primaryUuid(),
    branchId: branchId(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    method: text('method', { enum: PAYMENT_METHODS }).notNull(),
    paidAt: tstz('paid_at').notNull().defaultNow(),
    receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'restrict' }),
    submissionId: uuid('submission_id'),
    reversalOf: uuid('reversal_of'),
    idempotencyKey: text('idempotency_key').unique(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('payments_reversal_of_uq').on(t.reversalOf),
    index('payments_branch_id_idx').on(t.branchId),
    index('payments_student_id_idx').on(t.studentId),
    index('payments_paid_at_idx').on(t.paidAt),
    check('payments_method_check', oneOf(t.method, PAYMENT_METHODS)),
    check('payments_amount_nonzero_check', sql`${t.amount} != 0`),
  ],
);

export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    invoiceLineId: uuid('invoice_line_id')
      .notNull()
      .references(() => invoiceLines.id, { onDelete: 'restrict' }),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.paymentId, t.invoiceLineId] }),
    check('payment_allocations_amount_check', sql`${t.amount} > 0`),
  ],
);

export const paymentSubmissions = pgTable(
  'payment_submissions',
  {
    id: primaryUuid(),
    branchId: branchId(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'restrict' }),
    amountClaimed: bigint('amount_claimed', { mode: 'bigint' }).notNull(),
    comment: text('comment'),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'set null' }),
    imagePhash: text('image_phash'),
    status: text('status', { enum: PAYMENT_SUBMISSION_STATUSES })
      .notNull()
      .default('pending_review'),
    reviewLockedBy: uuid('review_locked_by').references(() => users.id, { onDelete: 'set null' }),
    reviewLockedUntil: tstz('review_locked_until'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: tstz('reviewed_at'),
    rejectReason: text('reject_reason'),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payment_submissions_branch_id_idx').on(t.branchId),
    index('payment_submissions_status_idx').on(t.status),
    index('payment_submissions_student_id_idx').on(t.studentId),
    check('payment_submissions_status_check', oneOf(t.status, PAYMENT_SUBMISSION_STATUSES)),
    check('payment_submissions_amount_check', sql`${t.amountClaimed} > 0`),
  ],
);

export const receipts = pgTable(
  'receipts',
  {
    id: primaryUuid(),
    number: text('number').notNull().unique(),
    paymentId: uuid('payment_id')
      .notNull()
      .unique()
      .references(() => payments.id, { onDelete: 'restrict' }),
    pdfFileId: uuid('pdf_file_id').references(() => files.id, { onDelete: 'set null' }),
    verifyToken: text('verify_token').notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index('receipts_payment_id_idx').on(t.paymentId)],
);

export const receiptCancellations = pgTable('receipt_cancellations', {
  receiptId: uuid('receipt_id')
    .primaryKey()
    .references(() => receipts.id, { onDelete: 'restrict' }),
  reversalPaymentId: uuid('reversal_payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'restrict' }),
  reason: text('reason').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'restrict' }),
  createdAt: createdAt(),
});

export const receiptCounters = pgTable('receipt_counters', {
  year: integer('year').primaryKey(),
  last: integer('last').notNull().default(0),
});

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: primaryUuid(),
    branchId: branchId(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    entryType: text('entry_type', { enum: LEDGER_ENTRY_TYPES }).notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    refTable: text('ref_table'),
    refId: uuid('ref_id'),
    occurredAt: tstz('occurred_at').notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index('ledger_entries_branch_id_idx').on(t.branchId),
    index('ledger_entries_student_id_idx').on(t.studentId),
    index('ledger_entries_occurred_at_idx').on(t.occurredAt),
    index('ledger_entries_entry_type_idx').on(t.entryType),
    check('ledger_entries_entry_type_check', oneOf(t.entryType, LEDGER_ENTRY_TYPES)),
  ],
);

export type InvoiceRow = typeof invoices.$inferSelect;
export type NewInvoiceRow = typeof invoices.$inferInsert;
export type InvoiceLineRow = typeof invoiceLines.$inferSelect;
export type NewInvoiceLineRow = typeof invoiceLines.$inferInsert;
export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntryRow = typeof ledgerEntries.$inferInsert;
