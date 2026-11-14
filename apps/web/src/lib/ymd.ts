/**
 * Kalendar kuni (`YYYY-MM-DD`) arifmetikasi — vaqt zonasiz (UTC orqali), faqat ko'rinish uchun
 * (hafta/oy oralig'i). Biznes hisob-kitobi serverda (`@lg/domain`).
 */
const DAY = 86_400_000;
const utc = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);

export const addDays = (ymd: string, n: number): string =>
  new Date(utc(ymd) + n * DAY).toISOString().slice(0, 10);

/** 1 — dushanba … 7 — yakshanba. */
export const weekdayOf = (ymd: string): number => new Date(utc(ymd)).getUTCDay() || 7;

/** Shu haftaning dushanbasi. */
export const weekStart = (ymd: string): string => addDays(ymd, 1 - weekdayOf(ymd));

export const range = (from: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => addDays(from, i));

/** Oy to'ri: oyning 1-kuni haftasidan oxirgi kuni haftasigacha (to'liq haftalar, 28–42 kun). */
export function monthGrid(ymd: string): string[] {
  const first = `${ymd.slice(0, 7)}-01`;
  const start = weekStart(first);
  const next = addMonths(first, 1);
  const end = addDays(weekStart(addDays(next, -1)), 6);
  return range(start, Math.round((utc(end) - utc(start)) / DAY) + 1);
}

/** Oyning 1-kuni ± n oy. */
export function addMonths(ymd: string, n: number): string {
  const d = new Date(utc(`${ymd.slice(0, 7)}-01`));
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** Kun boshi Toshkent vaqtida (`formatDate` uchun `Date`). */
export const toDate = (ymd: string): Date => new Date(`${ymd}T00:00:00+05:00`);
