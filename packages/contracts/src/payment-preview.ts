import { z } from 'zod';

/** W-13 (T-204, BR-12): to'lov saqlanishidan oldin FIFO taqsimot ko'rinishi — hisob serverda. */
export const PaymentPreviewQuery = z.object({
  studentId: z.string().uuid(),
  amount: z.string().regex(/^\d{1,15}$/, 'AMOUNT_POSITIVE_DIGITS'),
});
export type PaymentPreviewQueryInput = z.infer<typeof PaymentPreviewQuery>;

export const PaymentPreviewSchema = z.object({
  /** Hozirgi umumiy qarz (ochiq qatorlar qoldig'i). */
  debt: z.string(),
  /** Oy bo'yicha (YYYY-MM) taqsimot, eng eskisidan; `closes` — oy to'liq yopiladi. */
  parts: z.array(z.object({ period: z.string(), amount: z.string(), closes: z.boolean() })),
  advance: z.string(),
});
export type PaymentPreview = z.infer<typeof PaymentPreviewSchema>;
