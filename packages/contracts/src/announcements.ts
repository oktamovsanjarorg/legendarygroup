import { z } from 'zod';
import { NOTIFICATION_STATUSES } from './notifications.js';

export const ANNOUNCEMENT_TARGET_TYPES = ['all', 'course', 'group', 'debtors'] as const;
export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number];

export const ANNOUNCEMENT_STATUSES = [
  'draft',
  'scheduled',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_FILE_TYPES = ['image', 'document'] as const;
export type AnnouncementFileType = (typeof ANNOUNCEMENT_FILE_TYPES)[number];

export const CreateAnnouncementSchema = z
  .object({
    title: z.string().min(3).max(200),
    body: z.string().min(5).max(4000),
    targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES),
    targetId: z.string().uuid().optional().nullable(),
    fileUrl: z.string().url().optional().nullable(),
    fileType: z.enum(ANNOUNCEMENT_FILE_TYPES).optional().nullable(),
    sendNow: z.boolean().default(true),
    scheduledAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => {
      if ((data.targetType === 'course' || data.targetType === 'group') && !data.targetId) {
        return false;
      }
      return true;
    },
    {
      message: 'targetId is required when targetType is course or group',
      path: ['targetId'],
    },
  );
export type CreateAnnouncementRequest = z.infer<typeof CreateAnnouncementSchema>;

export const AnnouncementPreviewQuerySchema = z.object({
  targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES),
  targetId: z.string().uuid().optional(),
});
export type AnnouncementPreviewQuery = z.infer<typeof AnnouncementPreviewQuerySchema>;

export const AnnouncementPreviewResponseSchema = z.object({
  targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES),
  targetId: z.string().uuid().nullable(),
  recipientCount: z.number().int().nonnegative(),
  sampleRecipients: z.array(
    z.object({
      userId: z.string().uuid(),
      guardianName: z.string(),
      phone: z.string().nullable(),
      studentNames: z.array(z.string()),
    }),
  ),
});
export type AnnouncementPreviewResponse = z.infer<typeof AnnouncementPreviewResponseSchema>;

export const AnnouncementRecipientItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  recipientName: z.string(),
  recipientPhone: z.string().nullable(),
  channel: z.string(),
  status: z.enum(NOTIFICATION_STATUSES),
  sentAt: z.string().nullable(),
  failedReason: z.string().nullable(),
});
export type AnnouncementRecipientItem = z.infer<typeof AnnouncementRecipientItemSchema>;

export const AnnouncementStatsSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(ANNOUNCEMENT_STATUSES),
  totalRecipients: z.number().int().nonnegative(),
  queuedCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
  recipients: z.array(AnnouncementRecipientItemSchema),
});
export type AnnouncementStats = z.infer<typeof AnnouncementStatsSchema>;

export const AnnouncementItemSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  title: z.string(),
  body: z.string(),
  targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES),
  targetId: z.string().uuid().nullable(),
  fileUrl: z.string().nullable(),
  fileType: z.enum(ANNOUNCEMENT_FILE_TYPES).nullable(),
  status: z.enum(ANNOUNCEMENT_STATUSES),
  totalRecipients: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AnnouncementItem = z.infer<typeof AnnouncementItemSchema>;

export const AnnouncementListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES).optional(),
  status: z.enum(ANNOUNCEMENT_STATUSES).optional(),
});
export type AnnouncementListQuery = z.infer<typeof AnnouncementListQuerySchema>;
