import { TEACHER_CODE_MAX } from '@lg/contracts';

/**
 * Kodi yoʻq oʻquvchilarga taklif (T-128): ustozda band boʻlmagan eng kichik kodlar, roʻyxat
 * tartibida. Boʻsh kod qolmasa — `null` (ustoz oʻzi kiritadi yoki eskisini boʻshatadi).
 */
export function suggestCodes(
  rows: readonly { studentId: string; code: number | null }[],
  taken: ReadonlySet<number>,
): Map<string, number | null> {
  const out = new Map<string, number | null>();
  let next = 1;
  for (const r of rows) {
    if (r.code !== null) continue;
    while (next <= TEACHER_CODE_MAX && taken.has(next)) next += 1;
    out.set(r.studentId, next <= TEACHER_CODE_MAX ? next : null);
    next += 1;
  }
  return out;
}
