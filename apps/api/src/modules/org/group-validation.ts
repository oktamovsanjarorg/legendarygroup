import { HttpStatus } from '@nestjs/common';
import type { SlotInput } from '@lg/contracts';
import { courses, type CourseRow, rooms, type Transaction } from '@lg/db';
import { findSlotOverlap } from '@lg/domain';
import { eq } from 'drizzle-orm';
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
