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
