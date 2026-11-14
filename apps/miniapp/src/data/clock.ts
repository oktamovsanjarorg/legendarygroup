/**
 * Soat (CLAUDE.md: `new Date()` ekran mantiqida emas — shu orqali; testda muzlatiladi).
 * UI `@lg/domain`ga murojaat qilmaydi (03 §2), shuning uchun shu yerda — `Clock` bilan bir xil.
 */
export interface Clock {
  now(): Date;
  nowMs(): number;
  /** Toshkent bo'yicha `YYYY-MM-DD`. */
  today(): string;
}

const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const systemClock: Clock = {
  now: () => new Date(),
  nowMs: () => Date.now(),
  today: () => ymd.format(new Date()),
};

export const fixedClock = (iso: string): Clock => {
  const d = new Date(iso);
  return { now: () => new Date(d), nowMs: () => d.getTime(), today: () => ymd.format(d) };
};
