import { HttpStatus } from '@nestjs/common';
import type { ScheduleConflict } from '@lg/contracts';
import {
  type Database,
  groups,
  groupTeachers,
  isExclusionViolation,
  isUniqueViolation,
  scheduleOccupancy,
  scheduleSlots,
  type Transaction,
} from '@lg/db';
import { type OccupancyRow, occupancyFor, occupiesResources } from '@lg/domain';
import { and, eq, gt, gte, isNull, lt, lte, ne, or } from 'drizzle-orm';
import { AppException } from '../../common/errors/app.exception.js';

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Tranzaksiya ichidagi so'nggi qurilgan bandlik — to'qnashuv tafsilotini topish uchun. */
export interface OccupancyTrace {
  groupId: string;
  rows: OccupancyRow[];
}

/**
 * Guruh bandligini qayta qurish (FR-ORG-4): `occupancyFor()` → eski qatorlar o'chiriladi,
 * yangilari yoziladi. To'qnashuv bo'lsa — DB exclusion constraint rad etadi (poyga holatida ham).
 */
export async function rebuildOccupancy(
  tx: Transaction,
  groupId: string,
  trace: OccupancyTrace,
): Promise<void> {
  const [group] = await tx.select().from(groups).where(eq(groups.id, groupId));
  if (!group) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
  const slots = await tx.select().from(scheduleSlots).where(eq(scheduleSlots.groupId, groupId));
  const teachers = await tx.select().from(groupTeachers).where(eq(groupTeachers.groupId, groupId));
  const rows = occupancyFor(
    { ...group, occupies: occupiesResources(group.status) },
    slots,
    teachers.map((t) => ({ teacherId: t.teacherId, from: t.fromDate, to: t.toDate })),
  );
  trace.groupId = groupId;
  trace.rows = rows;
  await tx.delete(scheduleOccupancy).where(eq(scheduleOccupancy.groupId, groupId));
  if (rows.length === 0) return;
  await tx.insert(scheduleOccupancy).values(
    rows.map((r) => ({
      groupId,
      slotId: r.slotId,
      resourceKind: r.kind,
      resourceId: r.resourceId,
      weekday: r.weekday,
      startMin: r.startMin,
      endMin: r.endMin,
      validFrom: r.from,
      validTo: r.to,
    })),
  );
}

/** Rad etilgan bandlik qaysi guruh bilan to'qnashgani (tranzaksiya bekor bo'lgach o'qiladi). */
async function findConflicts(db: Database, trace: OccupancyTrace): Promise<ScheduleConflict[]> {
  const out: ScheduleConflict[] = [];
  for (const r of trace.rows) {
    const hits = await db
      .select({ groupId: groups.id, groupName: groups.name })
      .from(scheduleOccupancy)
      .innerJoin(groups, eq(groups.id, scheduleOccupancy.groupId))
      .where(
        and(
          ne(scheduleOccupancy.groupId, trace.groupId),
          eq(scheduleOccupancy.resourceKind, r.kind),
          eq(scheduleOccupancy.resourceId, r.resourceId),
          eq(scheduleOccupancy.weekday, r.weekday),
          lt(scheduleOccupancy.startMin, r.endMin),
          gt(scheduleOccupancy.endMin, r.startMin),
          r.to === null ? undefined : lte(scheduleOccupancy.validFrom, r.to),
          or(isNull(scheduleOccupancy.validTo), gte(scheduleOccupancy.validTo, r.from)),
        ),
      )
      .limit(1);
    for (const h of hits)
      out.push({
        kind: r.kind,
        resourceId: r.resourceId,
        ...h,
        weekday: r.weekday,
        startTime: hhmm(r.startMin),
        endTime: hhmm(r.endMin),
      });
  }
  return out;
}

const LESSON_CONSTRAINTS = {
  lessons_room_no_overlap: 'room',
  lessons_teacher_no_overlap: 'teacher',
  lessons_group_no_overlap: 'group',
} as const;

/** Dars darajasidagi to'qnashuv (0017) — qaysi resurs bo'yicha; boshqa xato — `null`. */
export function lessonConflictKind(err: unknown): 'room' | 'teacher' | 'group' | null {
  for (const [name, kind] of Object.entries(LESSON_CONSTRAINTS))
    if (isExclusionViolation(err, name)) return kind;
  return null;
}

/**
 * Guruh yozish amallarining DB xatolarini domen xatosiga aylantiradi: jadval to'qnashuvi
 * (tafsilot bilan), ustoz takrori, asosiy ustoz kesishuvi, nom bandligi.
 */
export async function withGroupConstraints<T>(
  db: Database,
  run: (trace: OccupancyTrace) => Promise<T>,
): Promise<T> {
  const trace: OccupancyTrace = { groupId: '', rows: [] };
  try {
    return await run(trace);
  } catch (err) {
    if (isExclusionViolation(err, 'schedule_occupancy_no_overlap'))
      throw new AppException(HttpStatus.CONFLICT, 'SCHEDULE_CONFLICT', {
        conflicts: await findConflicts(db, trace),
      });
    if (isExclusionViolation(err, 'group_teachers_no_duplicate'))
      throw new AppException(HttpStatus.CONFLICT, 'DUPLICATE_TEACHER');
    if (isExclusionViolation(err, 'group_teachers_one_main'))
      throw new AppException(HttpStatus.CONFLICT, 'MULTIPLE_MAIN_TEACHERS');
    const lesson = lessonConflictKind(err);
    if (lesson) throw new AppException(HttpStatus.CONFLICT, 'LESSON_CONFLICT', { kind: lesson });
    if (isUniqueViolation(err, 'groups_branch_name_current_uq'))
      throw new AppException(HttpStatus.CONFLICT, 'GROUP_NAME_TAKEN');
    throw err;
  }
}
