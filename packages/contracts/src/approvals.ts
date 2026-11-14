import { z } from 'zod';
import { ATTENDANCE_STATUSES } from './attendance.js';
import { PAYMENT_METHODS } from './billing.js';

export const APPROVAL_REQUEST_TYPES = [
  'discount',
  'reversal',
  'refund',
  'attendance_edit',
] as const;
export type ApprovalRequestType = (typeof APPROVAL_REQUEST_TYPES)[number];

export const APPROVAL_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
export type ApprovalRequestStatus = (typeof APPROVAL_REQUEST_STATUSES)[number];

/*
 * Payload'lar — tasdiqlangach bajariladigan amalning kirishi bilan bir xil (02 §5:
 * "qaror → amal bajariladi"). Amal Director nomidan, o'sha servis orqali (limitlar, ledger,
 * audit — bir joyda).
 */
/** BR-18: Admin limitidan yuqori doimiy chegirma — `PATCH /billing/enrollments/:id/discount`. */
export const DiscountPayloadSchema = z.object({
  enrollmentId: z.string().uuid(),
  percent: z.number().int().min(0).max(100),
  reason: z.string().trim().min(3).max(500),
});
export type DiscountPayload = z.infer<typeof DiscountPayloadSchema>;

/** BR-16: kiritilgan kundan keyingi storno. */
export const ReversalPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});
export type ReversalPayload = z.infer<typeof ReversalPayloadSchema>;

/** BR-17: avansdan pulni qaytarish (`POST /billing/payments/refund`). */
export const RefundPayloadSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.string().regex(/^[1-9]\d*$/, 'AMOUNT_MUST_BE_DIGITS'),
  method: z.enum(PAYMENT_METHODS),
  reason: z.string().trim().min(3).max(500),
});
export type RefundPayload = z.infer<typeof RefundPayloadSchema>;

/** BR-30: yopilgan oy davomatini o'zgartirish — bitta o'quvchi, bitta dars. */
export const AttendanceEditPayloadSchema = z
  .object({
    lessonId: z.string().uuid(),
    studentId: z.string().uuid(),
    status: z.enum(ATTENDANCE_STATUSES),
    lateMinutes: z.number().int().min(1).max(300).optional(),
    reason: z.string().trim().min(3).max(500),
  })
  .refine((p) => p.status !== 'late' || p.lateMinutes !== undefined, {
    message: 'LATE_MINUTES_REQUIRED',
    path: ['lateMinutes'],
  });
export type AttendanceEditPayload = z.infer<typeof AttendanceEditPayloadSchema>;

export const CreateApprovalRequest = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('discount'),
    payload: DiscountPayloadSchema,
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    type: z.literal('reversal'),
    payload: ReversalPayloadSchema,
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    type: z.literal('refund'),
    payload: RefundPayloadSchema,
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    type: z.literal('attendance_edit'),
    payload: AttendanceEditPayloadSchema,
    reason: z.string().trim().min(3).max(500),
  }),
]);
export type CreateApprovalRequestInput = z.infer<typeof CreateApprovalRequest>;

export const DecideApprovalRequest = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional(),
});
export type DecideApprovalRequestInput = z.infer<typeof DecideApprovalRequest>;

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  type: z.enum(APPROVAL_REQUEST_TYPES),
  payload: z.record(z.string(), z.unknown()),
  reason: z.string(),
  requestedBy: z.string().uuid(),
  requestedByName: z.string().optional(),
  status: z.enum(APPROVAL_REQUEST_STATUSES),
  decidedBy: z.string().uuid().nullable(),
  decidedByName: z.string().nullable().optional(),
  decidedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const ApprovalListQuery = z.object({
  status: z.enum(APPROVAL_REQUEST_STATUSES).optional(),
  type: z.enum(APPROVAL_REQUEST_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type ApprovalListQueryInput = z.infer<typeof ApprovalListQuery>;
