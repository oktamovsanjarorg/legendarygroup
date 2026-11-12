/**
 * Telefonni E.164 ga keltirish (T-105, 05 konvensiyasi). O'zbekiston formatlari:
 * `90 123 45 67`, `(90) 123-45-67`, `901234567`, `998901234567`, `+998 90 123 45 67`.
 * Boshqa davlat raqami — faqat `+` bilan to'liq (`+7...`). Yaroqsiz — `null`.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[\s()\-.]/g, '');
  if (!/^\+?[0-9]+$/.test(digits)) return null;
  const plain = digits.replace(/^\+/, '');
  if (digits.startsWith('+')) {
    if (plain.startsWith('998')) return plain.length === 12 ? `+${plain}` : null;
    return /^[1-9][0-9]{6,14}$/.test(plain) ? `+${plain}` : null;
  }
  if (plain.length === 9) return `+998${plain}`;
  if (plain.length === 12 && plain.startsWith('998')) return `+${plain}`;
  return null;
}
