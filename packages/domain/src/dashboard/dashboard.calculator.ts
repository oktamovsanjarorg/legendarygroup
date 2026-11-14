/**
 * Dashboard metriklari hisob-kitobi — FR-DASH-1, 5.
 */

/**
 * Ikki davr o'rtasidagi foiz o'zgarishi (masalan, joriy oy va o'tgan oy tushumi).
 */
export function calculatePercentageChange(current: bigint, previous: bigint): number {
  if (previous === 0n) {
    return current > 0n ? 100 : 0;
  }
  const diff = current - previous;
  return Number((diff * 100n) / previous);
}

/**
 * Davomat foizi (0 - 100 oralig'ida butun foiz).
 */
export function calculateAttendancePercent(attendedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((attendedCount * 100) / totalCount)));
}
