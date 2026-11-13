import { z } from 'zod';
import { normalizePhone } from './phone.js';

/**
 * Tizim sozlamalari sxemalari (T-115, FR-SYS-1).
 * Q-10, Q-13, Q-18, Q-19 va BR-2/8/10/18/31 standartlari asosida.
 */

export const CenterInfoSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'INVALID_PHONE' });
        return z.NEVER;
      }
      return n;
    }),
  address: z.string().trim().max(300).nullable(),
  logoFileId: z.string().uuid().nullable(),
});

export type CenterInfo = z.infer<typeof CenterInfoSchema>;

export const PaymentCardSchema = z.object({
  id: z.string().uuid(),
  cardNumber: z.string().trim().min(16).max(20),
  holderName: z.string().trim().min(2).max(100),
  bankName: z.string().trim().min(2).max(100),
  isPrimary: z.boolean(),
});

export type PaymentCard = z.infer<typeof PaymentCardSchema>;

export const PenaltyConfigSchema = z.object({
  enabled: z.boolean(),
  absenceThreshold: z.number().int().min(1).max(30),
  penaltyPerLesson: z.coerce.bigint().nonnegative().max(10_000_000n),
  lateThresholdMin: z.number().int().min(5).max(60),
});

export type PenaltyConfig = z.infer<typeof PenaltyConfigSchema>;

export const NotificationTimesSchema = z.object({
  morningReminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'INVALID_TIME_FORMAT'),
  eveningDigestTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'INVALID_TIME_FORMAT'),
  attendanceReminderMinutes: z.number().int().min(10).max(120),
});

export type NotificationTimes = z.infer<typeof NotificationTimesSchema>;

export const SystemSettingsSchema = z.object({
  centerInfo: CenterInfoSchema,
  paymentCards: z.array(PaymentCardSchema).max(10),
  billingDueDay: z.number().int().min(1).max(28),
  penaltyConfig: PenaltyConfigSchema,
  notificationTimes: NotificationTimesSchema,
  absenceNoticeWindowMinutes: z.number().int().min(1).max(30),
  adminDiscountLimitPercent: z.number().int().min(0).max(100),
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

export const UpdateSystemSettingsSchema = z
  .object({
    centerInfo: CenterInfoSchema.partial().optional(),
    paymentCards: z.array(PaymentCardSchema).max(10).optional(),
    billingDueDay: z.number().int().min(1).max(28).optional(),
    penaltyConfig: PenaltyConfigSchema.partial().optional(),
    notificationTimes: NotificationTimesSchema.partial().optional(),
    absenceNoticeWindowMinutes: z.number().int().min(1).max(30).optional(),
    adminDiscountLimitPercent: z.number().int().min(0).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'EMPTY_PATCH' });

export type UpdateSystemSettings = z.infer<typeof UpdateSystemSettingsSchema>;

export const PublicSettingsSchema = z.object({
  centerInfo: CenterInfoSchema,
  paymentCards: z.array(PaymentCardSchema),
  billingDueDay: z.number().int().min(1).max(28),
});

export type PublicSettings = z.infer<typeof PublicSettingsSchema>;

/**
 * 10-open-questions.md va 04-business-rules.md bo'yicha standart tizim sozlamalari.
 */
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  centerInfo: {
    name: 'Legendary Group',
    phone: '+998901234567',
    address: 'Toshkent shahri',
    logoFileId: null,
  },
  paymentCards: [],
  billingDueDay: 10, // Q-10: 10-sana
  penaltyConfig: {
    enabled: false, // Q-13: standart o'chiq
    absenceThreshold: 3, // BR-8: 3 ta sababsiz dars
    penaltyPerLesson: 0n,
    lateThresholdMin: 15, // BR-10: >= 15 daqiqa
  },
  notificationTimes: {
    morningReminderTime: '08:30',
    eveningDigestTime: '20:00',
    attendanceReminderMinutes: 30, // FR-ATT-5: 30 daqiqa
  },
  absenceNoticeWindowMinutes: 3, // Q-19, BR-31: 3 daqiqa
  adminDiscountLimitPercent: 10, // Q-18, BR-18: 10%
};
