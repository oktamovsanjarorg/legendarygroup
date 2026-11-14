import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'attendance_absent',
  'attendance_late',
  'attendance_correction',
  'billing_invoice_created',
  'billing_payment_confirmed',
  'billing_reminder',
  'grade_recorded',
  'test_results_published',
  'weekly_parent_report',
  'monthly_parent_report',
  'announcement',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const MANDATORY_NOTIFICATION_TYPES = [
  'attendance_absent',
  'attendance_correction',
  'billing_invoice_created',
  'billing_payment_confirmed',
] as const;
export type MandatoryNotificationType = (typeof MANDATORY_NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ['queued', 'sent', 'failed', 'blocked'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['telegram', 'sms', 'push'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// Preferences
export const NotificationPreferenceSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  enabled: z.boolean(),
  isMandatory: z.boolean(),
  titleUz: z.string(),
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

export const UpdateNotificationPreferencesRequestSchema = z.object({
  preferences: z.record(z.enum(NOTIFICATION_TYPES), z.boolean()),
});
export type UpdateNotificationPreferencesRequest = z.infer<
  typeof UpdateNotificationPreferencesRequestSchema
>;

// Notification Item
export const NotificationItemSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(NOTIFICATION_CHANNELS),
  recipient: z.string(),
  title: z.string().nullable(),
  body: z.string(),
  status: z.enum(NOTIFICATION_STATUSES),
  attempts: z.number().int().nonnegative(),
  failedReason: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;

// Undelivered
export const UndeliveredNotificationItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  recipient: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  status: z.enum(['failed', 'blocked']),
  failedReason: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type UndeliveredNotificationItem = z.infer<typeof UndeliveredNotificationItemSchema>;

export const ListUndeliveredQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(['failed', 'blocked']).optional(),
});
export type ListUndeliveredQuery = z.infer<typeof ListUndeliveredQuerySchema>;
