import type { DiscountInput } from './discount.js';
import { applyDiscounts } from './discount.js';
import { calculateMidMonthEnrollmentPrice } from './credits-penalties.js';

export type InvoiceLineKind = 'tuition' | 'penalty' | 'credit' | 'discount';

export interface PlannedInvoiceLine {
  enrollmentId: string;
  kind: InvoiceLineKind;
  /** Qator summasi: tuition/penalty uchun musbat (+), discount/credit uchun manfiy (-). */
  amount: bigint;
  description: string;
}

export interface EnrollmentBillingPlanInput {
  enrollmentId: string;
  groupName: string;
  monthlyPrice: bigint;
  /** Agar o'quvchi oy o'rtasida qo'shilgan bo'lsa (BR-3). */
  midMonth?: {
    remainingLessons: number;
    totalLessonsInMonth: number;
  };
  discounts?: readonly DiscountInput[];
  /** Bekor qilingan darslar krediti (BR-5). */
  lessonCredit?: bigint;
  /** Muzlatish krediti (BR-9). */
  freezeCredit?: bigint;
  /** Jarima summasi (BR-8). */
  penalty?: bigint;
}

/**
 * BR-1, BR-3, BR-5, BR-6, BR-8, BR-9, BR-18:
 * Bitta enrollment uchun oylik invoice qatorlarini rejalashtiradi.
 */
export function planEnrollmentInvoiceLines(
  input: EnrollmentBillingPlanInput,
): PlannedInvoiceLine[] {
  const lines: PlannedInvoiceLine[] = [];

  // 1. Asosiy o'qish narxi (tuition)
  let basePrice = input.monthlyPrice;
  if (input.midMonth) {
    basePrice = calculateMidMonthEnrollmentPrice(
      input.monthlyPrice,
      input.midMonth.remainingLessons,
      input.midMonth.totalLessonsInMonth,
    );
  }

  lines.push({
    enrollmentId: input.enrollmentId,
    kind: 'tuition',
    amount: basePrice,
    description: `${input.groupName} — oylik kurs toʻlovi`,
  });

  // 2. Chegirma (discount) — BR-18
  if (input.discounts && input.discounts.length > 0) {
    const disc = applyDiscounts(basePrice, input.discounts);
    if (disc.discountAmount > 0n) {
      lines.push({
        enrollmentId: input.enrollmentId,
        kind: 'discount',
        amount: -disc.discountAmount,
        description: 'Chegirma',
      });
    }
  }

  // 3. Bekor qilingan darslar krediti (BR-5)
  if (input.lessonCredit && input.lessonCredit > 0n) {
    lines.push({
      enrollmentId: input.enrollmentId,
      kind: 'credit',
      amount: -input.lessonCredit,
      description: 'Bekor qilingan darslar uchun kredit',
    });
  }

  // 4. Muzlatish krediti (BR-9)
  if (input.freezeCredit && input.freezeCredit > 0n) {
    lines.push({
      enrollmentId: input.enrollmentId,
      kind: 'credit',
      amount: -input.freezeCredit,
      description: 'Darslarni muzlatish (freeze) krediti',
    });
  }

  // 5. Jarima (penalty) — BR-8
  if (input.penalty && input.penalty > 0n) {
    lines.push({
      enrollmentId: input.enrollmentId,
      kind: 'penalty',
      amount: input.penalty,
      description: 'Sababsiz qatnashmaslik jarimasi',
    });
  }

  return lines;
}

/**
 * Invoice qatorlari asosida jami to'lanishi kerak bo'lgan summani hisoblaydi.
 * Jami summa har doim >= 0n (kreditlar oshib ketsa, qoldiq 0n bo'ladi).
 */
export function computeInvoiceTotal(lines: readonly { amount: bigint }[]): bigint {
  let net = 0n;
  for (const line of lines) {
    net += line.amount;
  }
  return net > 0n ? net : 0n;
}
