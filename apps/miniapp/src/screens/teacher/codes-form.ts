import { TEACHER_CODE_MAX, type TeacherCodeRow } from '@lg/contracts';

export type CodeIssue = 'invalid' | 'duplicate';

/** Boshlangʻich qiymat: ustoz kodi, boʻlmasa tizim taklifi (T-128, Q-92). */
export const initialCodes = (rows: readonly TeacherCodeRow[]): Record<string, string> =>
  Object.fromEntries(rows.map((r) => [r.studentId, String(r.code ?? r.suggested ?? '')]));

const parse = (v: string): number | null | 'invalid' => {
  if (v.trim() === '') return null;
  if (!/^\d{1,3}$/.test(v.trim())) return 'invalid';
  const n = Number(v.trim());
  return n >= 1 && n <= TEACHER_CODE_MAX ? n : 'invalid';
};

/** Har qator xatosi: notoʻgʻri son yoki roʻyxatda takror. */
export function codeIssues(values: Record<string, string>): Record<string, CodeIssue> {
  const out: Record<string, CodeIssue> = {};
  const seen = new Map<number, string[]>();
  for (const [id, v] of Object.entries(values)) {
    const n = parse(v);
    if (n === 'invalid') out[id] = 'invalid';
    else if (n !== null) seen.set(n, [...(seen.get(n) ?? []), id]);
  }
  for (const ids of seen.values()) if (ids.length > 1) for (const id of ids) out[id] = 'duplicate';
  return out;
}

/** Saqlanadigan oʻzgarishlar (faqat saqlangan koddan farqlilari); xato boʻlsa — `null`. */
export function changedCodes(
  rows: readonly TeacherCodeRow[],
  values: Record<string, string>,
): { studentId: string; code: number | null }[] | null {
  if (Object.keys(codeIssues(values)).length > 0) return null;
  return rows.flatMap((r) => {
    const n = parse(values[r.studentId] ?? '');
    const code = n === 'invalid' ? null : n;
    return code === r.code ? [] : [{ studentId: r.studentId, code }];
  });
}

/** Titul varaqdagi koʻrinish: `7` → `007`. */
export const titulCode = (v: string): string | null => {
  const n = parse(v);
  return typeof n === 'number' ? String(n).padStart(3, '0') : null;
};
