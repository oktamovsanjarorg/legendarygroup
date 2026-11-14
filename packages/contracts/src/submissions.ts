import { z } from 'zod';
import { PAYMENT_SUBMISSION_STATUSES } from './billing.js';

export const CreatePaymentSubmissionRequest = z.object({
  studentId: z.string().uuid(),
  amountClaimed: z.string().regex(/^\d+$/, 'AMOUNT_POSITIVE_DIGITS'),
  comment: z.string().trim().max(500).optional(),
  fileId: z.string().uuid(),
});
export type CreatePaymentSubmissionInput = z.infer<typeof CreatePaymentSubmissionRequest>;

export const ConfirmPaymentSubmissionRequest = z.object({
  amount: z.string().regex(/^\d+$/, 'AMOUNT_POSITIVE_DIGITS').optional(),
  notes: z.string().trim().max(500).optional(),
});
export type ConfirmPaymentSubmissionInput = z.infer<typeof ConfirmPaymentSubmissionRequest>;

export const RejectPaymentSubmissionRequest = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type RejectPaymentSubmissionInput = z.infer<typeof RejectPaymentSubmissionRequest>;

export const PaymentSubmissionSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  studentCode: z.string().optional(),
  groupName: z.string().optional(),
  guardianId: z.string().uuid(),
  guardianName: z.string().optional(),
  amountClaimed: z.string(),
  comment: z.string().nullable(),
  fileId: z.string().uuid().nullable(),
  fileUrl: z.string().nullable().optional(),
  status: z.enum(PAYMENT_SUBMISSION_STATUSES),
  reviewLockedBy: z.string().uuid().nullable(),
  reviewLockedByName: z.string().optional(),
  reviewLockedUntil: z.string().nullable(),
  reviewedBy: z.string().uuid().nullable(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().nullable(),
  rejectReason: z.string().nullable(),
  paymentId: z.string().uuid().nullable(),
  receiptNumber: z.string().nullable().optional(),
  duplicateWarning: z.string().nullable().optional(),
  overdue: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PaymentSubmission = z.infer<typeof PaymentSubmissionSchema>;

export const PaymentSubmissionListQuery = z.object({
  status: z.enum(PAYMENT_SUBMISSION_STATUSES).optional(),
  studentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type PaymentSubmissionListQueryInput = z.infer<typeof PaymentSubmissionListQuery>;

export const ConfirmSubmissionResponseSchema = z.object({
  success: z.boolean(),
  paymentId: z.string().uuid(),
  receiptNumber: z.string(),
});
export type ConfirmSubmissionResponse = z.infer<typeof ConfirmSubmissionResponseSchema>;

export const SubmissionActionResponseSchema = z.object({
  success: z.boolean(),
});
export type SubmissionActionResponse = z.infer<typeof SubmissionActionResponseSchema>;
