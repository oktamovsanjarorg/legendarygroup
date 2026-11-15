import { z } from 'zod';
import { PAYMENT_METHODS } from './billing.js';

/** W-17 to'lov tafsiloti (T-205/T-209, FR-PAY-6/8/9): xodim uchun to'liq ko'rinish. */
export const PaymentViewSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  amount: z.string(),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string(),
  receiptNumber: z.string().nullable(),
  /** QR tekshiruv havolasi (W-34). */
  verifyUrl: z.string().nullable(),
  createdBy: z.string().nullable(),
  /** O'tkazma cheki orqali (FR-PAY-4) — tasdiqlagan xodim `createdBy`. */
  viaSubmission: z.boolean(),
  /** Oy bo'yicha taqsimot (BR-12). */
  allocations: z.array(z.object({ period: z.string(), amount: z.string() })),
  /** BR-16: bekor qilingan bo'lsa — sabab. */
  reversed: z.object({ reason: z.string(), at: z.string() }).nullable(),
  /** Shu foydalanuvchi to'g'ridan-to'g'ri storno qila oladimi (aks holda — so'rov, T-119). */
  canReverseNow: z.boolean(),
});
export type PaymentView = z.infer<typeof PaymentViewSchema>;

/** W-18 (T-203, BR-18): amaldagi doimiy chegirmalar — sabab va bergan xodim audit'dan. */
export const DiscountListItemSchema = z.object({
  enrollmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  student: z.string(),
  group: z.string(),
  percent: z.number().int(),
  reason: z.string().nullable(),
  by: z.string().nullable(),
});
export type DiscountListItem = z.infer<typeof DiscountListItemSchema>;

export const DiscountListResponseSchema = z.object({
  adminLimitPercent: z.number().int(),
  items: z.array(DiscountListItemSchema),
});
export type DiscountListResponse = z.infer<typeof DiscountListResponseSchema>;
