import { addDays } from '../policies/index.js';

/**
 * Jadval va resurs bandligi (T-103, FR-ORG-4) — sof funksiyalar.
 * Sanalar `YYYY-MM-DD` (Asia/Tashkent kalendar kuni), oraliqlar ikki tomondan yopiq; `to: null` — cheksiz.
 * Vaqt — kun boshidan daqiqa, oraliq `[start, end)` (09:00–10:30 va 10:30–12:00 kesishmaydi).
 */

export interface DateSpan {
  from: string;
  to: string | null;
}

/** Ikki sana oralig'ining kesishmasi; bo'sh bo'lsa — `null`. */
export function intersectSpans(a: DateSpan, b: DateSpan): DateSpan | null {
  const from = a.from > b.from ? a.from : b.from;
  const to = a.to === null ? b.to : b.to === null ? a.to : a.to < b.to ? a.to : b.to;
  return to !== null && to < from ? null : { from, to };
}

export function spansOverlap(a: DateSpan, b: DateSpan): boolean {
  return intersectSpans(a, b) !== null;
}

/** `HH:MM` yoki `HH:MM:SS` → daqiqa. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m))
    throw new Error(`notoʻgʻri vaqt: ${time}`);
  return h * 60 + m;
}

export interface Slot {
  id: string;
  /** 1 — dushanba … 7 — yakshanba (ISO). */
  weekday: number;
  startTime: string;
  endTime: string;
  validFrom: string;
  validTo: string | null;
}

export interface TeacherAssignment {
  teacherId: string;
  from: string;
  to: string | null;
}

export interface GroupForOccupancy {
  roomId: string | null;
  startDate: string;
  endDate: string | null;
  /** Yakunlangan guruh resurs band qilmaydi (`occupiesResources`). */
  occupies: boolean;
}

export type ResourceKind = 'room' | 'teacher';

export interface OccupancyRow {
  slotId: string;
  kind: ResourceKind;
  resourceId: string;
  weekday: number;
  startMin: number;
  endMin: number;
  from: string;
  to: string | null;
}

/**
 * Guruh jadvali qaysi resursni qachon band qiladi: har slot × (xona) va slot × (har ustoz
 * biriktirilgan davr), guruh sanalari bilan kesishgan qismi. DB'da exclusion constraint shu
 * qatorlar ustida to'qnashuvni rad etadi.
 */
export function occupancyFor(
  group: GroupForOccupancy,
  slots: readonly Slot[],
  teachers: readonly TeacherAssignment[],
): OccupancyRow[] {
  if (!group.occupies) return [];
  const groupSpan = { from: group.startDate, to: group.endDate };
  const rows: OccupancyRow[] = [];
  for (const s of slots) {
    const slotSpan = intersectSpans(groupSpan, { from: s.validFrom, to: s.validTo });
    if (!slotSpan) continue;
    const base = {
      slotId: s.id,
      weekday: s.weekday,
      startMin: toMinutes(s.startTime),
      endMin: toMinutes(s.endTime),
    };
    if (group.roomId) rows.push({ ...base, kind: 'room', resourceId: group.roomId, ...slotSpan });
    for (const t of teachers) {
      const span = intersectSpans(slotSpan, { from: t.from, to: t.to });
      if (span) rows.push({ ...base, kind: 'teacher', resourceId: t.teacherId, ...span });
    }
  }
  return rows;
}

/** Bir guruh ichidagi slotlar o'zaro kesishadimi (bir hafta kuni, vaqt va amal davri). */
export function findSlotOverlap(slots: readonly Slot[]): [Slot, Slot] | null {
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i];
      const b = slots[j];
      if (!a || !b || a.weekday !== b.weekday) continue;
      const timeOverlap =
        toMinutes(a.startTime) < toMinutes(b.endTime) &&
        toMinutes(b.startTime) < toMinutes(a.endTime);
      const dateOverlap = spansOverlap(
        { from: a.validFrom, to: a.validTo },
        { from: b.validFrom, to: b.validTo },
      );
      if (timeOverlap && dateOverlap) return [a, b];
    }
  }
  return null;
}

/**
 * Jadvalni `from` sanasidan almashtirish: eski slotlar `from - 1` da yopiladi, `from` dan keyin
 * boshlanganlari o'chiriladi (o'tmish o'zgarmaydi — T-104 kelajakdagi darslarni qayta hisoblaydi).
 */
export function planScheduleChange(
  existing: readonly Slot[],
  from: string,
): { close: { id: string; validTo: string }[]; remove: string[] } {
  const close: { id: string; validTo: string }[] = [];
  const remove: string[] = [];
  for (const s of existing) {
    if (s.validFrom >= from) remove.push(s.id);
    else if (s.validTo === null || s.validTo >= from)
      close.push({ id: s.id, validTo: addDays(from, -1) });
  }
  return { close, remove };
}
