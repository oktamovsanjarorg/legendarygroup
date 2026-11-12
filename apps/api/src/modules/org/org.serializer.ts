import type { Course, Room } from '@lg/contracts';
import type { CourseRow, RoomRow } from '@lg/db';

/** DB qatori → API javobi: pul — string, vaqt — ISO (12-ai-playbook.md §5). */
export function toCourse(r: CourseRow): Course {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    levels: r.levels,
    defaultMonthlyPrice: r.defaultMonthlyPrice.toString(),
    lessonDurationMin: r.lessonDurationMin,
    durationMonths: r.durationMonths,
    gradeScale: r.gradeScale,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toRoom(r: RoomRow): Room {
  return {
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

type Plain = Record<string, unknown>;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Audit uchun faqat o'zgargan maydonlar (12-ai-playbook.md §5): `before`/`after` juftligi.
 * `keys` — solishtiriladigan maydonlar (vaqt tamg'alari kirmaydi).
 */
export function changedFields(
  before: Plain,
  after: Plain,
  keys: readonly string[],
): { before: Plain; after: Plain } {
  const b: Plain = {};
  const a: Plain = {};
  for (const k of keys) {
    if (same(before[k], after[k])) continue;
    b[k] = before[k];
    a[k] = after[k];
  }
  return { before: b, after: a };
}

export const COURSE_AUDIT_FIELDS = [
  'name',
  'description',
  'levels',
  'defaultMonthlyPrice',
  'lessonDurationMin',
  'durationMonths',
  'gradeScale',
  'archivedAt',
] as const;

export const ROOM_AUDIT_FIELDS = ['name', 'capacity', 'archivedAt'] as const;
