/**
 * Hisobotlar va analitika ko'rsatkichlarini hisoblash domain qoidalari (FR-DASH-2).
 */

export type DebtAgingCategory = 'fresh' | 'overdue' | 'critical';

/**
 * Qarzdorlik kechikish kunlari bo'yicha toifani aniqlaydi.
 * - 0–7 kun: fresh (yangi paydo bo'lgan)
 * - 8–30 kun: overdue (muddati o'tgan)
 * - >30 kun: critical (surunkali/xavfli)
 */
export function classifyDebtAgingBucket(daysOverdue: number): DebtAgingCategory {
  if (daysOverdue <= 7) return 'fresh';
  if (daysOverdue <= 30) return 'overdue';
  return 'critical';
}

/**
 * Davomat foizini bazis punktlarda hisoblaydi (1% = 100 bp, 100% = 10000 bp).
 * Kechikkanlar (late) yarim davomat (0.5) hisoblanadi.
 */
export function calculateAttendanceRateBp(present: number, late: number, total: number): number {
  if (total <= 0) return 0;
  const effectivePresent = present + late * 0.5;
  const rate = Math.round((effectivePresent / total) * 10000);
  return Math.max(0, Math.min(10000, rate));
}

/**
 * Lidlar konversiya darajasini hisoblaydi (0..10000 bp).
 */
export function calculateConversionRateBp(won: number, total: number): number {
  if (total <= 0) return 0;
  const rate = Math.round((won / total) * 10000);
  return Math.max(0, Math.min(10000, rate));
}

/**
 * Kohorta o'quvchi saqlanishi (retention) darajasini hisoblaydi (0..10000 bp).
 */
export function calculateRetentionRateBp(active: number, initial: number): number {
  if (initial <= 0) return 0;
  const rate = Math.round((active / initial) * 10000);
  return Math.max(0, Math.min(10000, rate));
}

/**
 * Ustoz umumiy samaradorlik ballini hisoblaydi:
 * - 40% davomat
 * - 40% saqlanish (retention)
 * - 20% o'rtacha baho/test natijasi
 */
export function calculateTeacherCompositeScore(params: {
  attendanceBp: number;
  retentionBp: number;
  gradeScoreBp: number;
}): number {
  const score = Math.round(
    params.attendanceBp * 0.4 + params.retentionBp * 0.4 + params.gradeScoreBp * 0.2,
  );
  return Math.max(0, Math.min(10000, score));
}
