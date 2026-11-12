import { addDays } from '../policies/index.js';
import { type DateSpan, intersectSpans } from '../org/schedule.js';

/**
 * Enrollment (FR-STU-3, BR-9, BR-32, T-106) — sof qoidalar. Sanalar `YYYY-MM-DD`, ikki tomondan
 * yopiq; `to: null` — cheksiz. Holat saqlanmaydi — sanalardan hisoblanadi (cron kerak emas).
 */

export type EnrollmentState = 'upcoming' | 'active' | 'frozen' | 'ended';

/** BR-9: uzoq muddatli sababli qatnashmaslik — kamida 2 hafta. */
export const MIN_FREEZE_DAYS = 14;

const inSpan = (s: DateSpan, day: string) => s.from <= day && (s.to === null || s.to >= day);

/** Kun bo'yicha holat: boshlanmagan → muzlatilgan (muzlatish shu kunni qamrasa) → tugagan. */
export function enrollmentState(
  e: DateSpan,
  freezes: readonly DateSpan[],
  day: string,
): EnrollmentState {
  if (day < e.from) return 'upcoming';
  if (e.to !== null && day > e.to) return 'ended';
  return freezes.some((f) => inSpan(f, day)) ? 'frozen' : 'active';
}

/**
 * `window` davrida bir vaqtda eng ko'p nechta enrollment amalda (guruh sig'imi uchun).
 * Eng yuqori nuqta — biror boshlanish sanasida (oraliqlar yopiq), shu nuqtalar tekshiriladi.
 */
export function peakConcurrency(existing: readonly DateSpan[], window: DateSpan): number {
  const inWindow = existing.filter((e) => intersectSpans(e, window) !== null);
  const points = new Set([
    window.from,
    ...inWindow.map((e) => e.from).filter((d) => inSpan(window, d)),
  ]);
  let peak = 0;
  for (const p of points) peak = Math.max(peak, inWindow.filter((e) => inSpan(e, p)).length);
  return peak;
}

/** Kunlar soni (ikki tomondan yopiq). */
export function daysInclusive(from: string, to: string): number {
  return (
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  );
}

export type FreezeError = 'FREEZE_TOO_SHORT' | 'FREEZE_OUTSIDE_ENROLLMENT' | 'FREEZE_OVERLAP';

/** Muzlatish: ≥ 14 kun (BR-9), enrollment davri ichida, boshqa muzlatish bilan kesishmaydi. */
export function validateFreeze(
  enrollment: DateSpan,
  others: readonly DateSpan[],
  freeze: { from: string; to: string },
): FreezeError | null {
  if (daysInclusive(freeze.from, freeze.to) < MIN_FREEZE_DAYS) return 'FREEZE_TOO_SHORT';
  const inside =
    freeze.from >= enrollment.from && (enrollment.to === null || freeze.to <= enrollment.to);
  if (!inside) return 'FREEZE_OUTSIDE_ENROLLMENT';
  if (others.some((o) => intersectSpans(o, freeze) !== null)) return 'FREEZE_OVERLAP';
  return null;
}

/** Ko'chirish: eski enrollment `date - 1` da tugaydi, yangisi `date` dan (FR-STU-3). */
export function transferSplit(date: string): { endOld: string; startNew: string } {
  return { endOld: addDays(date, -1), startNew: date };
}
