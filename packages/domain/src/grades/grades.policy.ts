import type { GradeScale } from '@lg/contracts';

/**
 * BR-33 Bahoni guruh shkalasiga mosligini tekshirish.
 * - 0_5: 0..5
 * - 0_100: 0..100
 */
export function validateGradeValue(scale: GradeScale, value: number): boolean {
  if (value < 0) return false;
  if (scale === '0_5') return value <= 5;
  if (scale === '0_100') return value <= 100;
  return false;
}

/**
 * BR-33 Baho turi guruh sozlamalarida yoqilganligini tekshirish.
 */
export function validateGradeKind(allowedKinds: readonly string[], kind: string): boolean {
  return allowedKinds.includes(kind);
}
