import { z } from 'zod';

export const APPROVAL_REQUEST_TYPES = [
  'discount',
  'reversal',
  'refund',
  'attendance_edit',
] as const;
export type ApprovalRequestType = (typeof APPROVAL_REQUEST_TYPES)[number];

export const APPROVAL_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
export type ApprovalRequestStatus = (typeof APPROVAL_REQUEST_STATUSES)[number];

export const DiscountPayloadSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  percent: z.number().int().min(1).max(100),
  reason: z.string().trim().min(3).max(500),
});
export type DiscountPayload = z.infer<typeof DiscountPayloadSchema>;

export const ReversalPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});
export type ReversalPayload = z.infer<typeof ReversalPayloadSchema>;

export const RefundPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.string().regex(/^\d+$/, 'AMOUNT_MUST_BE_DIGITS'),
  reason: z.string().trim().min(3).max(500),
});
export type RefundPayload = z.infer<typeof RefundPayloadSchema>;

export const AttendanceEditPayloadSchema = z.object({
  lessonId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.enum(['attended', 'late', 'excused', 'unexcused']),
  reason: z.string().trim().min(3).max(500),
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
