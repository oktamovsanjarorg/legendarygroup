import { addDays } from '../policies/index.js';
import { type DateSpan, intersectSpans, type Slot, type TeacherAssignment } from './schedule.js';

/**
 * Darslar generatsiyasi (T-104, FR-ORG-5, BR-3/BR-5) — sof funksiyalar.
 * Sanalar `YYYY-MM-DD` (Asia/Tashkent), vaqt `HH:MM`.
 */

/** Generatsiya oynasi (hafta) — kamida shuncha oldinga. */
export const LESSON_HORIZON_DAYS = 28;

/** Oyning oxirgi kuni (`2026-02-15` → `2026-02-28`). */
export function endOfMonth(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

/** Keyingi oyning 1-kuni. */
export function startOfNextMonth(ymd: string): string {
  return addDays(endOfMonth(ymd), 1);
}

/**
 * Gorizont: kamida 4 hafta **va** keyingi kalendar oyining oxirigacha (FR-ORG-5, Q-73) —
 * oy boshidagi invoice (BR-3) butun oy darslarini bilishi shart.
 */
export function lessonHorizon(today: string): string {
  const weeks = addDays(today, LESSON_HORIZON_DAYS);
  const nextMonthEnd = endOfMonth(startOfNextMonth(today));
  return weeks > nextMonthEnd ? weeks : nextMonthEnd;
}

/** ISO hafta kuni: 1 — dushanba … 7 — yakshanba. */
export function isoWeekday(ymd: string): number {
  const d = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** `HH:MM:SS` → `HH:MM` (DB `time` qiymati). */
export const hhmm = (time: string): string => time.slice(0, 5);

export interface PlannedLesson {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Slotlardan `range` ichidagi darslar: har slot o'z amal davri bilan kesishgan kunlari,
 * hafta kuni mos, bayram emas (BR-3: bayramlar generatsiya qilinmaydi). Sana/vaqt bo'yicha tartiblangan.
 */
export function planLessons(
  slots: readonly Slot[],
  range: DateSpan & { to: string },
  holidays: ReadonlySet<string>,
): PlannedLesson[] {
  const out: PlannedLesson[] = [];
  for (const s of slots) {
    const span = intersectSpans({ from: s.validFrom, to: s.validTo }, range);
    if (!span) continue;
    const to = span.to ?? range.to;
    const shift = (s.weekday - isoWeekday(span.from) + 7) % 7;
    for (let day = addDays(span.from, shift); day <= to; day = addDays(day, 7)) {
      if (holidays.has(day)) continue;
      out.push({ slotId: s.id, date: day, startTime: hhmm(s.startTime), endTime: hhmm(s.endTime) });
    }
  }
  return out.sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
  );
}

/** Sanada amaldagi asosiy ustoz (bir davrda bittasi — DB EXCLUDE kafolatlaydi). */
export function teacherOn(main: readonly TeacherAssignment[], date: string): string | null {
  return main.find((a) => a.from <= date && (a.to === null || a.to >= date))?.teacherId ?? null;
}

/** Dars kaliti — idempotentlik: unique(group_id, date, start_time). */
export const lessonKey = (l: { date: string; startTime: string }): string =>
  `${l.date} ${hhmm(l.startTime)}`;

/**
 * Bayram qo'shilganda shu kundagi darslar bilan nima qilinadi (Q-71): joriy yoki o'tgan oy —
 * invoice allaqachon shu darslarni hisoblagan, shuning uchun **bekor qilinadi** (BR-5 kredit);
 * keyingi oylar — hali hisoblanmagan, **o'chiriladi** (BR-3: bayram darsi rejalashtirilmaydi).
 */
export function holidayEffect(holiday: string, today: string): 'cancel' | 'delete' {
  return holiday < startOfNextMonth(today) ? 'cancel' : 'delete';
}

/** Generatsiya qilinadigan guruh holatlari: shakllanayotgan va faol (Q-71). */
export const generatesLessons = (status: string): boolean =>
  status === 'forming' || status === 'active';
