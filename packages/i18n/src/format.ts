/**
 * Formatlash (FR-SYS-3, 11-ux §3). Pul — faqat `bigint` so'm (CLAUDE.md "Pul").
 * Ming ajratuvchi — U+00A0 (qator bo'linmasin), "soʻm" — U+02BB bilan.
 */
export const NBSP = ' ';
/** Valyuta yorlig'i (formatMoney va summa maydonlari uchun yagona manba). */
export const CURRENCY = 'soʻm';
const SOM = CURRENCY;

/** `1250000n` → `1 250 000 soʻm`; manfiy — `−1 250 000 soʻm` (U+2212). */
export function formatMoney(amount: bigint, opts: { withCurrency?: boolean } = {}): string {
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const value = `${negative ? '−' : ''}${grouped}`;
  return opts.withCurrency === false ? value : `${value}${NBSP}${SOM}`;
}

/** Oddiy, NBSP (U+00A0) va tor NBSP (U+202F) bo'shliqlar. */
const SPACES = new RegExp('[\\s\\u00a0\\u202f]', 'g');

/** Foydalanuvchi kiritgan summa (`1 250 000`, `1250000`) → `bigint`; noto'g'ri — `null`. */
export function parseMoney(input: string): bigint | null {
  const cleaned = input.replace(SPACES, '').replace(new RegExp(`${SOM}$`, 'i'), '');
  return /^-?\d{1,15}$/.test(cleaned) ? BigInt(cleaned) : null;
}

const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;
const TZ = 'Asia/Tashkent';

function tashkentParts(date: Date): { y: number; m: number; d: number; hh: string; mm: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    y: Number(parts['year']),
    m: Number(parts['month']),
    d: Number(parts['day']),
    hh: parts['hour'] ?? '00',
    mm: parts['minute'] ?? '00',
  };
}

/** `10-noyabr, 2026` (T-009). `withYear: false` → `10-noyabr`. Vaqt zonasi — Toshkent. */
export function formatDate(date: Date, opts: { withYear?: boolean } = {}): string {
  const { y, m, d } = tashkentParts(date);
  const base = `${d}-${MONTHS[m - 1]}`;
  return opts.withYear === false ? base : `${base}, ${y}`;
}

/** Jadvallar uchun: `10.11.2026` (11-ux §3). */
export function formatDateShort(date: Date): string {
  const { y, m, d } = tashkentParts(date);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

/** `15:00` (Toshkent). */
export function formatTime(date: Date): string {
  const { hh, mm } = tashkentParts(date);
  return `${hh}:${mm}`;
}

/** Telefon: `+998901234567` → `+998 90 123 45 67`. */
export function formatPhone(e164: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+998${NBSP}${m[1]}${NBSP}${m[2]}${NBSP}${m[3]}${NBSP}${m[4]}` : e164;
}
