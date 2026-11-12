import { maskPhone } from './pii.js';

type Plain = Record<string, unknown>;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** PII maydonlar audit'da maskalanadi (12-ai-playbook.md §5, 07 §3). */
const PHONE_KEYS: ReadonlySet<string> = new Set(['phone']);
const masked = (key: string, v: unknown): unknown =>
  PHONE_KEYS.has(key) && typeof v === 'string' ? maskPhone(v) : v;

/** Audit `after` uchun — PII maskalangan nusxa (yangi yozuv yaratishda). */
export function maskPii(obj: Plain): Plain {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, masked(k, v)]));
}

/**
 * Audit uchun faqat o'zgargan maydonlar (12-ai-playbook.md §5): `before`/`after` juftligi,
 * PII maskalangan. `keys` — solishtiriladigan maydonlar (vaqt tamg'alari kirmaydi).
 */
export function changedFields(
  before: Plain,
  after: Plain,
  keys: readonly string[],
): { before: Plain; after: Plain } {
  const b: Plain = {};
  const a: Plain = {};
  for (const k of keys) {
    if (same(before[k], after[k])) continue;
    b[k] = masked(k, before[k]);
    a[k] = masked(k, after[k]);
  }
  return { before: b, after: a };
}
