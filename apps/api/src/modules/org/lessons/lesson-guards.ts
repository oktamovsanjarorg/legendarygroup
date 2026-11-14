import { HttpStatus } from '@nestjs/common';
import {
  type GroupRow,
  isUniqueViolation,
  type LessonRow,
  lessons,
  scheduleOccupancy,
  type Transaction,
} from '@lg/db';
import { isoWeekday, lessonHorizon, toMinutes } from '@lg/domain';
import { and, eq, gt, gte, isNull, lt, lte, ne, or } from 'drizzle-orm';
import { AppException } from '../../../common/errors/app.exception.js';
import { lessonConflictKind } from '../schedule-occupancy.js';

/** Yangi (qo'shimcha / qoplovchi) dars joyi. */
export interface LessonSlot {
  date: string;
  startTime: string;
  endTime: string;
  roomId: string | null;
  teacherId: string | null;
}

export async function lockLesson(tx: Transaction, id: string): Promise<LessonRow> {
  const [l] = await tx.select().from(lessons).where(eq(lessons.id, id)).for('update');
  if (!l) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
  return l;
}

export function assertScheduled(l: LessonRow): void {
  if (l.status !== 'scheduled')
    throw new AppException(HttpStatus.CONFLICT, 'LESSON_NOT_SCHEDULED', { status: l.status });
}

/** Yangi dars: o'tmishda emas (Q-86) va guruh davri ichida. */
export function assertBookable(g: GroupRow, date: string, today: string): void {
  if (date < today) throw new AppException(HttpStatus.BAD_REQUEST, 'LESSON_IN_PAST');
  if (date < g.startDate || (g.endDate !== null && date > g.endDate))
    throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', {
      startDate: g.startDate,
      endDate: g.endDate,
    });
}

/**
 * Gorizontdan keyingi sana uchun: boshqa guruhlarning haftalik jadvali (hali generatsiya
 * qilinmagan darslar) bilan to'qnashuv. Gorizont ichida darslar bor — DB EXCLUDE tekshiradi
 * (bekor qilingan dars joyi bo'sh hisoblanadi).
 */
export async function assertFreeBeyondHorizon(
  tx: Transaction,
  groupId: string,
  s: LessonSlot,
  today: string,
): Promise<void> {
  if (s.date <= lessonHorizon(today)) return;
  const resources = [
    s.roomId
      ? and(eq(scheduleOccupancy.resourceKind, 'room'), eq(scheduleOccupancy.resourceId, s.roomId))
      : undefined,
    s.teacherId
      ? and(
          eq(scheduleOccupancy.resourceKind, 'teacher'),
          eq(scheduleOccupancy.resourceId, s.teacherId),
        )
      : undefined,
  ].filter((x) => x !== undefined);
  if (resources.length === 0) return;
  const [hit] = await tx
    .select({ kind: scheduleOccupancy.resourceKind })
    .from(scheduleOccupancy)
    .where(
      and(
        ne(scheduleOccupancy.groupId, groupId),
        or(...resources),
        eq(scheduleOccupancy.weekday, isoWeekday(s.date)),
        lt(scheduleOccupancy.startMin, toMinutes(s.endTime)),
        gt(scheduleOccupancy.endMin, toMinutes(s.startTime)),
        lte(scheduleOccupancy.validFrom, s.date),
        or(isNull(scheduleOccupancy.validTo), gte(scheduleOccupancy.validTo, s.date)),
      ),
    )
    .limit(1);
  if (hit) throw new AppException(HttpStatus.CONFLICT, 'LESSON_CONFLICT', { kind: hit.kind });
}

/** Dars yozish amallari: DB to'qnashuvi (0017) va kalit bandligi → 409. */
export async function withLessonConstraints<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const kind = lessonConflictKind(err);
    if (kind) throw new AppException(HttpStatus.CONFLICT, 'LESSON_CONFLICT', { kind });
    if (isUniqueViolation(err, 'lessons_group_date_start_uq'))
      throw new AppException(HttpStatus.CONFLICT, 'LESSON_CONFLICT', { kind: 'group' });
    throw err;
  }
}
