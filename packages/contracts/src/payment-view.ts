import { z } from 'zod';
import { PAYMENT_METHODS } from './billing.js';

/** To'lov, storno (teskari yozuv) yoki avansni qaytarish. */
export const PAYMENT_KINDS = ['payment', 'reversal', 'refund'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

/** W-17 to'lov tafsiloti (T-205/T-209, FR-PAY-6/8/9): xodim uchun to'liq ko'rinish. */
export const PaymentViewSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  kind: z.enum(PAYMENT_KINDS),
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

/** W-16 (T-209, FR-PAY-10): kun bo'yicha naqd to'lovlar (storno — manfiy) va yopilish holati. */
export const CashDaySchema = z.object({
  date: z.string(),
  expectedCash: z.string(),
  payments: z.array(
    z.object({
      id: z.string().uuid(),
      paidAt: z.string(),
      student: z.string(),
      amount: z.string(),
      receiptNumber: z.string().nullable(),
    }),
  ),
  closed: z
    .object({
      at: z.string(),
      by: z.string().nullable(),
      /** Yopilgan paytdagi kutilgan summa — keyin toʻlov qoʻshilgan boʻlsa `expectedCash`dan farq qiladi. */
      expectedCash: z.string(),
      countedCash: z.string(),
      note: z.string().nullable(),
    })
    .nullable(),
});
export type CashDay = z.infer<typeof CashDaySchema>;

/** MS-24 (T-153): markaz to'lovlari tarixi — to'lov, storno va qaytarish bitta ro'yxatda. */
export const PaymentHistoryQuery = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    method: z.enum(PAYMENT_METHODS).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    /** Oldingi sahifaning oxirgi to'lovi. */
    cursor: z.uuid().optional(),
  })
  .refine((v) => v.to >= v.from, { message: 'DATE_RANGE', path: ['to'] });
export type PaymentHistoryQueryInput = z.infer<typeof PaymentHistoryQuery>;

export const PaymentHistoryItemSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  student: z.string(),
  kind: z.enum(PAYMENT_KINDS),
  amount: z.string(),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string(),
  receiptNumber: z.string().nullable(),
  /** Chek bekor qilingan (BR-16). */
  cancelled: z.boolean(),
});
export type PaymentHistoryItem = z.infer<typeof PaymentHistoryItemSchema>;

export const PaymentHistorySchema = z.object({
  items: z.array(PaymentHistoryItemSchema),
  /** Davrdagi sof tushum (storno va qaytarishlar ayirilgan), filtr bilan. */
  total: z.string(),
  nextCursor: z.string().nullable(),
});
export type PaymentHistory = z.infer<typeof PaymentHistorySchema>;
