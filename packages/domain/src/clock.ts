export interface Clock {
  /** Hozirgi vaqtni Date sifatida qaytaradi. */
  now(): Date;
  /** Hozirgi vaqtni millisekundlarda qaytaradi. */
  nowMs(): number;
  /** Berilgan yoki standart vaqt zonasidagi 'YYYY-MM-DD' sanasini qaytaradi. */
  today(timeZone?: string): string;
}

export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

export function formatDateToYmd(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Tizim soati — ishlab chiqarish va oddiy ish jarayonlari uchun. */
export class SystemClock implements Clock {
  constructor(private readonly timeZone: string = DEFAULT_TIMEZONE) {}

  now(): Date {
    return new Date();
  }

  nowMs(): number {
    return Date.now();
  }

  today(timeZone: string = this.timeZone): string {
    return formatDateToYmd(this.now(), timeZone);
  }
}

/** Muzlatilgan soat — testlar va deterministik ssenariylar uchun. */
export class FixedClock implements Clock {
  private current: Date;

  constructor(
    initial: Date | string | number = new Date(),
    private readonly timeZone: string = DEFAULT_TIMEZONE,
  ) {
    this.current = new Date(initial);
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  nowMs(): number {
    return this.current.getTime();
  }

  today(timeZone: string = this.timeZone): string {
    return formatDateToYmd(this.now(), timeZone);
  }

  setNow(date: Date | string | number): void {
    this.current = new Date(date);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/**
 * Toshkent devor vaqti → aniq lahza. O'zbekistonda 1992-yildan beri yozgi vaqt yo'q (UTC+5),
 * shuning uchun siljish doimiy. Kun/oy chegarasini UTC bo'yicha olish (`…T00:00:00Z`) —
 * 00:00–05:00 orasidagi yozuvlarni oldingi kunga tushiradi; shu funksiyalardan foydalaning.
 */
export function tashkentInstant(ymd: string, hhmm = '00:00'): Date {
  return new Date(`${ymd}T${hhmm.slice(0, 5)}:00+05:00`);
}

/** Toshkent kuni `[start, end)` oralig'i (end — keyingi kun boshi, istisno). */
export function tashkentDayRange(ymd: string): { start: Date; end: Date } {
  const start = tashkentInstant(ymd);
  return { start, end: new Date(start.getTime() + 24 * 3600 * 1000) };
}

/** Toshkent oyi `[start, end)` oralig'i; `period` — `YYYY-MM`. */
export function tashkentMonthRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { start: tashkentInstant(`${period}-01`), end: tashkentInstant(`${next}-01`) };
}
