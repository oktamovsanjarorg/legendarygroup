import { z } from 'zod';

export const ABSENCE_NOTICE_STATUSES = ['pending', 'acknowledged', 'applied', 'cancelled'] as const;
export type AbsenceNoticeStatus = (typeof ABSENCE_NOTICE_STATUSES)[number];

export const CreateAbsenceNoticeSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD formati talab qilinadi'),
  reason: z.string().trim().min(3).max(300),
});
export type CreateAbsenceNoticeRequest = z.infer<typeof CreateAbsenceNoticeSchema>;

export const AbsenceNoticeItemSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  guardianUserId: z.string().uuid(),
  guardianName: z.string(),
  date: z.string(),
  reason: z.string(),
  status: z.enum(ABSENCE_NOTICE_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AbsenceNoticeItem = z.infer<typeof AbsenceNoticeItemSchema>;

export const ListAbsenceNoticesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  studentId: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(ABSENCE_NOTICE_STATUSES).optional(),
});
export type ListAbsenceNoticesQuery = z.infer<typeof ListAbsenceNoticesQuerySchema>;
