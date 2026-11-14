import { z } from 'zod';
import { ROLES } from './roles.js';

export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'login', 'other'] as const;
export type AuditActionKind = (typeof AUDIT_ACTIONS)[number];

export const AuditDiffItemSchema = z.object({
  field: z.string(),
  before: z.unknown(),
  after: z.unknown(),
});
export type AuditDiffItem = z.infer<typeof AuditDiffItemSchema>;

export const AuditLogItemSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  actorId: z.string().uuid().nullable(),
  userName: z.string(),
  userRole: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  target: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  diff: z.array(AuditDiffItemSchema).optional(),
});
export type AuditLogItem = z.infer<typeof AuditLogItemSchema>;

export const ListAuditLogsQuery = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuery>;

export const SuspiciousActivityItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  riskLevel: z.enum(['high', 'medium']),
  timestamp: z.string(),
  userName: z.string(),
  actorId: z.string().uuid().nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
});
export type SuspiciousActivityItem = z.infer<typeof SuspiciousActivityItemSchema>;

export const StaffActivityItemSchema = z.object({
  staffId: z.string().uuid(),
  staffName: z.string(),
  role: z.enum(ROLES),
  paymentsCount: z.number().int().min(0),
  approvalsCount: z.number().int().min(0),
  avgResponseTimeMinutes: z.number().nullable(),
  avgResponseTimeFormatted: z.string(),
});
export type StaffActivityItem = z.infer<typeof StaffActivityItemSchema>;

export const StaffActivityQuery = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
export type StaffActivityQuery = z.infer<typeof StaffActivityQuery>;
