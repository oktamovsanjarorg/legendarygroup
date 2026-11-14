import { HttpStatus } from '@nestjs/common';
import type { SlotInput } from '@lg/contracts';
import { courses, type CourseRow, groups, lessons, rooms, type Transaction } from '@lg/db';
import { findSlotOverlap } from '@lg/domain';
import { and, eq, gte, ne } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppException } from '../../common/errors/app.exception.js';
import type { StaffDirectoryService } from '../rbac/index.js';

/** Kurs mavjud va arxivda emas (yangi guruh arxivdagi kursga ochilmaydi). */
export async function activeCourse(tx: Transaction, id: string): Promise<CourseRow> {
  const [c] = await tx.select().from(courses).where(eq(courses.id, id));
  if (!c) throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'courseId' });
  if (c.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'COURSE_ARCHIVED');
  return c;
}

/** Xona faol va sig'imi guruh maksimumidan kam emas (Q-69). */
export async function assertRoomFits(
  tx: Transaction,
  roomId: string | null,
  maxStudents: number,
): Promise<void> {
  if (roomId === null) return;
  const [r] = await tx.select().from(rooms).where(eq(rooms.id, roomId));
  if (!r) throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'roomId' });
  if (r.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'ROOM_ARCHIVED');
  if (r.capacity < maxStudents)
    throw new AppException(HttpStatus.CONFLICT, 'ROOM_CAPACITY_EXCEEDED', {
      capacity: r.capacity,
    });
}

export async function assertTeachers(
  staff: StaffDirectoryService,
  tx: Transaction,
  list: readonly { teacherId: string; role: string }[],
): Promise<void> {
  if (list.filter((t) => t.role === 'main').length > 1)
    throw new AppException(HttpStatus.BAD_REQUEST, 'MULTIPLE_MAIN_TEACHERS');
  if (new Set(list.map((t) => t.teacherId)).size !== list.length)
    throw new AppException(HttpStatus.BAD_REQUEST, 'DUPLICATE_TEACHER');
  for (const t of list)
    if (!(await staff.isActiveTeacher(t.teacherId, tx)))
      throw new AppException(HttpStatus.BAD_REQUEST, 'NOT_A_TEACHER');
}

/** Yangi slotlar o'zaro kesishmasin (bitta guruh ichida) — `[start, end)`. */
export function assertSlotsDisjoint(slots: readonly SlotInput[], from: string): void {
  const withIds = slots.map((s, i) => ({ ...s, id: String(i), validFrom: from, validTo: null }));
  if (findSlotOverlap(withIds)) throw new AppException(HttpStatus.BAD_REQUEST, 'SLOT_OVERLAP');
}

/** Q-66: yakunlanmagan guruhi bor kurs/xona arxivlanmaydi. */
export async function assertNoCurrentGroups(
  tx: Transaction,
  column: AnyPgColumn,
  id: string,
): Promise<void> {
  const [g] = await tx
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(column, id), ne(groups.status, 'finished')))
    .limit(1);
  if (g) throw new AppException(HttpStatus.CONFLICT, 'HAS_ACTIVE_GROUPS');
}

/** Q-66 (T-104): kelajakdagi (bekor qilinmagan) darsi bor xona arxivlanmaydi. */
export async function assertNoFutureLessons(
  tx: Transaction,
  roomId: string,
  today: string,
): Promise<void> {
  const [l] = await tx
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(eq(lessons.roomId, roomId), gte(lessons.date, today), ne(lessons.status, 'cancelled')),
    )
    .limit(1);
  if (l) throw new AppException(HttpStatus.CONFLICT, 'HAS_ACTIVE_GROUPS');
}
