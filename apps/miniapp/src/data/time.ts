/**
 * Toshkent vaqti (UTC+5, yozgi vaqt yo'q). API sana `YYYY-MM-DD` va vaqt `HH:MM` ni alohida
 * beradi — ular Toshkent bo'yicha (03 §5).
 */
export const TASHKENT_OFFSET = '+05:00';

export const atTashkent = (date: string, hhmm: string): Date =>
  new Date(`${date}T${hhmm}:00${TASHKENT_OFFSET}`);

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` + n kun (UTC tushda — sana siljimaydi). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  return new Date(d.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/** Dushanbadan boshlanadigan hafta (`date` shu haftada). */
export function weekDates(date: string): string[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 — yakshanba
  const monday = addDays(date, weekday === 0 ? -6 : 1 - weekday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
