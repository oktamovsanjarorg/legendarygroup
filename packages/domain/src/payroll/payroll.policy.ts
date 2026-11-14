import { prorate } from '../billing/prorate.js';

export interface ContractDetails {
  type: 'fixed' | 'percent' | 'mixed';
  fixedAmount: bigint;
  percentBp: number;
  perLessonRate: bigint;
}

export interface TeacherLessonMetrics {
  totalScheduledLessons: number;
  substituteLessonsTaughtByOthers: number;
  substituteLessonsTaughtAsSub: number;
}

/**
 * BR-23 & BR-25: Fiks oylik qismini hisoblash.
 * Agar ustoz darslarini o'rinbosar o'tgan bo'lsa, o'rinbosar darslari soniga proporsional qisqartiriladi.
 */
export function calculateFixedSalary(
  fixedAmount: bigint,
  totalScheduledLessons: number,
  substituteLessonsTaughtByOthers: number,
): bigint {
  if (fixedAmount <= 0n) return 0n;
  if (totalScheduledLessons <= 0 || substituteLessonsTaughtByOthers <= 0) {
    return fixedAmount;
  }

  const reduction = prorate(
    fixedAmount,
    Math.min(substituteLessonsTaughtByOthers, totalScheduledLessons),
    totalScheduledLessons,
  );
  const remaining = fixedAmount - reduction;
  return remaining > 0n ? remaining : 0n;
}

/**
 * BR-23 & BR-24: Foiz bo'yicha hisob-kitob.
 * percentBp: 0..10000 (1% = 100 bazis punkt).
 */
export function calculatePercentSalary(baseAmount: bigint, percentBp: number): bigint {
  if (baseAmount <= 0n || percentBp <= 0) return 0n;
  const bpClamped = Math.min(Math.max(percentBp, 0), 10000);
  return (baseAmount * BigInt(bpClamped)) / 10000n;
}

/**
 * BR-23 & BR-25: O'rinbosar sifatida o'tilgan darslar uchun to'lov.
 */
export function calculateSubstituteSalary(
  substituteLessonsCount: number,
  perLessonRate: bigint,
): bigint {
  if (substituteLessonsCount <= 0 || perLessonRate <= 0n) return 0n;
  return BigInt(substituteLessonsCount) * perLessonRate;
}

/**
 * BR-27 & BR-28: Jami to'lanadigan oylikni hisoblash (Net salary).
 */
export function calculateNetSalary(items: Array<{ kind: string; amount: bigint }>): bigint {
  let total = 0n;
  for (const item of items) {
    total += item.amount;
  }
  return total > 0n ? total : 0n;
}
