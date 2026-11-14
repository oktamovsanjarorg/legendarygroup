import { prorate } from './prorate.js';

/** Chegirma kiritish shakli (foiz yoki qat'iy summa). */
export type DiscountInput =
  { type: 'percent'; percent: number } | { type: 'fixed'; amount: bigint };

export interface AppliedDiscountResult {
  /** Asl narx. */
  basePrice: bigint;
  /** Chegirma summasi (so'm, >= 0n). */
  discountAmount: bigint;
  /** Chegirmadan keyingi yakuniy to'lanadigan narx (basePrice - discountAmount). */
  netPrice: bigint;
  /** Qo'llangan chegirma (agar mavjud bo'lsa). */
  applied: DiscountInput | null;
}

/**
 * Berilgan narx uchun chegirma qiymatini so'mda hisoblaydi.
 */
export function calculateDiscountAmount(basePrice: bigint, discount: DiscountInput): bigint {
  if (basePrice <= 0n) return 0n;
  if (discount.type === 'percent') {
    if (discount.percent <= 0) return 0n;
    if (discount.percent >= 100) return basePrice;
    return prorate(basePrice, discount.percent, 100);
  }
  if (discount.amount <= 0n) return 0n;
  return discount.amount >= basePrice ? basePrice : discount.amount;
}

/**
 * BR-18: Bir nechta chegirma qo'shilmaydi — invoice qatori uchun so'mdagi qiymati eng katta bo'lgani qo'llanadi.
 */
export function bestDiscount(
  basePrice: bigint,
  discounts: readonly DiscountInput[],
): DiscountInput | null {
  if (discounts.length === 0 || basePrice <= 0n) return null;
  let maxAmount = 0n;
  let winner: DiscountInput | null = null;

  for (const d of discounts) {
    const val = calculateDiscountAmount(basePrice, d);
    if (val > maxAmount) {
      maxAmount = val;
      winner = d;
    }
  }

  return winner;
}

/**
 * BR-18: Chegirmalarni taqqoslab, eng kattasini qo'llaydi.
 */
export function applyDiscounts(
  basePrice: bigint,
  discounts: readonly DiscountInput[],
): AppliedDiscountResult {
  if (basePrice <= 0n) {
    return {
      basePrice: 0n,
      discountAmount: 0n,
      netPrice: 0n,
      applied: null,
    };
  }

  const chosen = bestDiscount(basePrice, discounts);
  if (!chosen) {
    return {
      basePrice,
      discountAmount: 0n,
      netPrice: basePrice,
      applied: null,
    };
  }

  const discountAmount = calculateDiscountAmount(basePrice, chosen);
  return {
    basePrice,
    discountAmount,
    netPrice: basePrice - discountAmount,
    applied: chosen,
  };
}

/**
 * BR-18: Admin chegirma limiti tekshiruvi (standart 10%, sozlanadi).
 * Undan kattasini faqat Director tasdiqlaydi (T-119).
 */
export function validateAdminDiscount(
  basePrice: bigint,
  discount: DiscountInput,
  maxPercent = 10,
): boolean {
  if (basePrice <= 0n) return true;
  if (maxPercent < 0) return false;
  if (discount.type === 'percent') {
    return discount.percent >= 0 && discount.percent <= maxPercent;
  }
  if (discount.amount <= 0n) return true;
  const maxAllowedAmount = prorate(basePrice, maxPercent, 100);
  return discount.amount <= maxAllowedAmount;
}
