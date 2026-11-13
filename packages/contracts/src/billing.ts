import { z } from 'zod';

/** Billing va moliya konstantalari (T-202, FR-BIL-1/2, BR-1/2/6/20). */

export const INVOICE_STATUSES = ['open', 'paid', 'partially_paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_LINE_KINDS = ['tuition', 'penalty', 'credit', 'discount'] as const;
export type InvoiceLineKind = (typeof INVOICE_LINE_KINDS)[number];

export const LEDGER_ENTRY_TYPES = [
  'invoice',
  'payment',
  'discount',
  'penalty',
  'refund',
  'reversal',
  'credit',
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const PAYMENT_METHODS = ['cash', 'card', 'bank', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_SUBMISSION_STATUSES = ['pending_review', 'confirmed', 'rejected'] as const;
export type PaymentSubmissionStatus = (typeof PAYMENT_SUBMISSION_STATUSES)[number];

export const PeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'PERIOD_FORMAT_YYYY_MM');

export const InvoiceLineSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  enrollmentId: z.string().uuid().nullable(),
  kind: z.enum(INVOICE_LINE_KINDS),
  amount: z.string(),
  description: z.string(),
  createdAt: z.string(),
});
export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  studentId: z.string().uuid(),
  period: PeriodSchema,
  dueDate: z.string(),
  total: z.string(),
  status: z.enum(INVOICE_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const InvoiceWithLinesSchema = InvoiceSchema.extend({
  lines: z.array(InvoiceLineSchema),
});
export type InvoiceWithLines = z.infer<typeof InvoiceWithLinesSchema>;

export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  studentId: z.string().uuid(),
  entryType: z.enum(LEDGER_ENTRY_TYPES),
  amount: z.string(),
  refTable: z.string().nullable(),
  refId: z.string().uuid().nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const StudentLedgerSummarySchema = z.object({
  studentId: z.string().uuid(),
  balance: z.string(),
  totalDebt: z.string(),
  totalAdvance: z.string(),
  isCritical: z.boolean(),
});
export type StudentLedgerSummary = z.infer<typeof StudentLedgerSummarySchema>;

export const InvoiceListQuery = z.object({
  period: PeriodSchema.optional(),
  studentId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type InvoiceListQueryInput = z.infer<typeof InvoiceListQuery>;

export const LedgerListQuery = z.object({
  entryType: z.enum(LEDGER_ENTRY_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type LedgerListQueryInput = z.infer<typeof LedgerListQuery>;

export const GenerateInvoicesRequest = z.object({
  period: PeriodSchema,
  dueDate: z.iso.date().optional(),
});
export type GenerateInvoicesInput = z.infer<typeof GenerateInvoicesRequest>;
