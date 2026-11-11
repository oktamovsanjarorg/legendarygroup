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
