/**
 * Summani so'z bilan (chek uchun, T-205): `1250000n` → "bir million ikki yuz ellik ming".
 * Rasmiy imlo (oʻ/gʻ — U+02BB). 0 … 999 999 999 999 999.
 */
const ONES = ['', 'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz'];
const TENS = [
  '',
  'oʻn',
  'yigirma',
  'oʻttiz',
  'qirq',
  'ellik',
  'oltmish',
  'yetmish',
  'sakson',
  'toʻqson',
];
const SCALES = ['', 'ming', 'million', 'milliard', 'trillion'];

function triple(n: number): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h) out.push(ONES[h] ?? '', 'yuz');
  if (t) out.push(TENS[t] ?? '');
  if (o) out.push(ONES[o] ?? '');
  return out;
}

export const MAX_WORDS_AMOUNT = 999_999_999_999_999n;

export function toWordsUz(amount: bigint): string {
  if (amount < 0n || amount > MAX_WORDS_AMOUNT) throw new RangeError('toWordsUz: 0 … 999 trillion');
  if (amount === 0n) return 'nol';
  const words: string[] = [];
  let rest = amount;
  let scale = 0;
  const groups: { n: number; scale: number }[] = [];
  while (rest > 0n) {
    groups.unshift({ n: Number(rest % 1000n), scale });
    rest /= 1000n;
    scale += 1;
  }
  for (const g of groups) {
    if (g.n === 0) continue;
    words.push(...triple(g.n));
    if (g.scale > 0) words.push(SCALES[g.scale] ?? '');
  }
  return words.filter(Boolean).join(' ');
}

/** Chek: "Bir million ikki yuz ellik ming soʻm" (bosh harf bilan). */
export const amountInWords = (amount: bigint): string => {
  const w = toWordsUz(amount);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} soʻm`;
};
