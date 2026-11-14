import { prorate, roundDownToThousand } from './prorate.js';

/**
 * BR-3: Oy o'rtasida qo'shilgan o'quvchi narxi:
 * prorate(monthlyPrice, remainingLessons, totalLessonsInMonth),
 * so'ng 1 000 so'mga karrali qilib pastga yaxlitlanadi (o'quvchi foydasiga).
 */
export function calculateMidMonthEnrollmentPrice(
  monthlyPrice: bigint,
  remainingLessons: number,
  totalLessonsInMonth: number,
): bigint {
  if (monthlyPrice <= 0n || remainingLessons <= 0 || totalLessonsInMonth <= 0) {
    return 0n;
  }
  const prorated = prorate(monthlyPrice, remainingLessons, totalLessonsInMonth);
  return roundDownToThousand(prorated);
}

/**
 * BR-5: Markaz tomonidan bekor qilingan darslar uchun kredit:
 * prorate(monthlyPrice, cancelledLessons, totalPlannedLessons).
 */
export function calculateLessonCredit(
  monthlyPrice: bigint,
  cancelledLessons: number,
  totalPlannedLessons: number,
): bigint {
  if (monthlyPrice <= 0n || cancelledLessons <= 0 || totalPlannedLessons <= 0) {
    return 0n;
  }
  return prorate(monthlyPrice, cancelledLessons, totalPlannedLessons);
}

/**
 * BR-9: Muzlatish (freeze) krediti:
 * prorate(monthlyPrice, frozenPlannedLessons, totalPlannedLessonsInMonth).
 */
export function calculateFreezeCredit(
  monthlyPrice: bigint,
  frozenPlannedLessons: number,
  totalPlannedLessonsInMonth: number,
): bigint {
  if (
    monthlyPrice <= 0n ||
    frozenPlannedLessons <= 0 ||
    totalLessonsInMonthCheck(totalPlannedLessonsInMonth)
  ) {
    return 0n;
  }
  return prorate(monthlyPrice, frozenPlannedLessons, totalPlannedLessonsInMonth);
}

function totalLessonsInMonthCheck(total: number): boolean {
  return total <= 0;
}

/**
 * BR-10: Kech qolishlarni sababsiz qatnashmaslikka aylantirish:
 * 3 ta kech qolish (>= 15 daq) = 1 ta sababsiz qatnashmaslik (jarima uchun).
 */
export function lateToUnexcusedAbsences(lateCount: number): number {
  if (lateCount <= 0) return 0;
  return Math.floor(lateCount / 3);
}

/**
 * BR-8 & BR-10: Jarima hisobi (oy yopilishida keyingi oy invoice'iga qo'shiladi):
 * jami sababsiz = unexcusedAbsences + lateToUnexcusedAbsences(lateCount)
 * ortiqcha = max(0, jami - threshold)
 * jarima = ortiqcha * penaltyPerLesson
 */
export function calculatePenalty(params: {
  unexcusedAbsences: number;
  lateCount?: number;
  threshold?: number; // standart 3
  penaltyPerLesson?: bigint; // standart 0n (o'chirilgan)
}): bigint {
  const threshold = params.threshold ?? 3;
  const penaltyPerLesson = params.penaltyPerLesson ?? 0n;
  if (penaltyPerLesson <= 0n) return 0n;

  const lateAbsences = lateToUnexcusedAbsences(params.lateCount ?? 0);
  const totalAbsences = Math.max(0, params.unexcusedAbsences) + lateAbsences;
  const extraAbsences = Math.max(0, totalAbsences - threshold);

  return BigInt(extraAbsences) * penaltyPerLesson;
}
