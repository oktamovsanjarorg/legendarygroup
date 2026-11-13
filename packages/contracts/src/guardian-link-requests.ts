import { z } from 'zod';
import { GUARDIAN_RELATIONS } from './students.js';

export const GUARDIAN_LINK_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type GuardianLinkRequestStatus = (typeof GUARDIAN_LINK_REQUEST_STATUSES)[number];

export const GuardianLinkRequestSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  telegramId: z.string(),
  telegramUsername: z.string().nullable().optional(),
  phone: z.string(),
  fullName: z.string(),
  status: z.enum(GUARDIAN_LINK_REQUEST_STATUSES),
  rejectReason: z.string().nullable().optional(),
  resolvedGuardianId: z.string().uuid().nullable().optional(),
  resolvedBy: z.string().uuid().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GuardianLinkRequest = z.infer<typeof GuardianLinkRequestSchema>;

export const ListGuardianLinkRequestsQuerySchema = z.object({
  status: z.enum(GUARDIAN_LINK_REQUEST_STATUSES).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});
export type ListGuardianLinkRequestsQuery = z.infer<typeof ListGuardianLinkRequestsQuerySchema>;

export const ApproveGuardianLinkRequestSchema = z.object({
  guardianId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  relation: z.enum(GUARDIAN_RELATIONS).optional(),
});
export type ApproveGuardianLinkRequest = z.infer<typeof ApproveGuardianLinkRequestSchema>;

export const RejectGuardianLinkRequestSchema = z.object({
  reason: z.string().min(2).max(500),
});
export type RejectGuardianLinkRequest = z.infer<typeof RejectGuardianLinkRequestSchema>;

export const BotGuardianContactRequest = z.object({
  telegramId: z.coerce.bigint().positive(),
  phone: z.string().min(7).max(20),
  fullName: z.string().min(1).max(128),
  username: z.string().max(64).optional(),
});
export type BotGuardianContactRequest = z.infer<typeof BotGuardianContactRequest>;

export const BotGuardianContactResult = z.object({
  result: z.enum([
    'guardian_linked',
    'already_linked',
    'request_created',
    'pending_approval',
    'staff_linked',
  ]),
  fullName: z.string().optional(),
  students: z.array(z.object({ id: z.string(), fullName: z.string() })).optional(),
});
export type BotGuardianContactResult = z.infer<typeof BotGuardianContactResult>;

export const BotTelegramStatusRequest = z.object({
  telegramId: z.coerce.bigint().positive(),
});
export type BotTelegramStatusRequest = z.infer<typeof BotTelegramStatusRequest>;

export const BotTelegramStatusResult = z.object({
  status: z.enum(['not_registered', 'pending_approval', 'linked', 'rejected']),
  role: z.string().optional(),
  fullName: z.string().optional(),
  students: z.array(z.object({ id: z.string(), fullName: z.string() })).optional(),
  rejectReason: z.string().optional(),
});
export type BotTelegramStatusResult = z.infer<typeof BotTelegramStatusResult>;
