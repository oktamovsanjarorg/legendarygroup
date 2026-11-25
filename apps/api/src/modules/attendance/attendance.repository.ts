import { Inject, Injectable } from '@nestjs/common';
import {
  attendance,
  type AttendanceRow,
  courses,
  type Database,
  enrollmentFreezes,
  enrollments,
  groups,
  lessons,
  type NewAttendanceRow,
  roles,
  students,
  type Transaction,
  userRoles,
  users,
} from '@lg/db';
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

export interface EnrichedAttendanceRow extends AttendanceRow {
  studentName: string;
  studentCode: number;
  markedByName: string;
}

export interface ExpectedStudentRow {
  id: string;
  fullName: string;
  code: string;
  /** BR-9: shu kuni muzlatilgan — sababli hisoblanadi. */
  freezeReason: string | null;
}

@Injectable()
export class AttendanceRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async findLessonById(lessonId: string) {
    const [row] = await this.db
      .select({
        id: lessons.id,
        groupId: lessons.groupId,
        groupName: groups.name,
        date: lessons.date,
        startTime: lessons.startTime,
        endTime: lessons.endTime,
        teacherId: lessons.teacherId,
        teacherName: users.fullName,
        status: lessons.status,
      })
      .from(lessons)
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .leftJoin(users, eq(users.id, lessons.teacherId))
      .where(eq(lessons.id, lessonId));
    return row ?? null;
  }

  /** BR-32 Dars sanasida guruhda faol bo'lgan o'quvchilar ro'yxati. */
  async findExpectedStudents(groupId: string, lessonDate: string): Promise<ExpectedStudentRow[]> {
    const rows = await this.db
      .select({
        id: students.id,
        fullName: students.fullName,
        code: students.code,
        freezeReason: sql<string | null>`(select f.reason from ${enrollmentFreezes} f
          where f.enrollment_id = ${enrollments.id}
          and f.from_date <= ${lessonDate} and f.to_date >= ${lessonDate} limit 1)`,
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.groupId, groupId),
          lte(enrollments.startDate, lessonDate),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, lessonDate)),
        ),
      )
      .orderBy(students.fullName);

    return rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      code: `LG-${r.code}`,
      freezeReason: r.freezeReason,
    }));
  }

  async findLessonAttendance(lessonId: string): Promise<EnrichedAttendanceRow[]> {
    const rows = await this.db
      .select({
        record: attendance,
        studentName: students.fullName,
        studentCode: students.code,
        markedByName: users.fullName,
      })
      .from(attendance)
      .innerJoin(students, eq(students.id, attendance.studentId))
      .innerJoin(users, eq(users.id, attendance.markedBy))
      .where(eq(attendance.lessonId, lessonId))
      .orderBy(students.fullName);

    return rows.map((r) => ({
      ...r.record,
      studentName: r.studentName,
      studentCode: Number(r.studentCode),
      markedByName: r.markedByName,
    }));
  }

  async findStudentAttendance(studentId: string, from?: string, to?: string) {
    const conds = [eq(attendance.studentId, studentId)];
    if (from) conds.push(gte(lessons.date, from));
    if (to) conds.push(lte(lessons.date, to));

    return this.db
      .select({
        id: attendance.id,
        lessonId: attendance.lessonId,
        date: lessons.date,
        startTime: lessons.startTime,
        endTime: lessons.endTime,
        groupName: groups.name,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        note: attendance.note,
        markedAt: attendance.markedAt,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .where(and(...conds))
      .orderBy(desc(lessons.date), desc(lessons.startTime));
  }

  transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(run);
  }

  async upsertAttendanceBatch(tx: Transaction, records: NewAttendanceRow[]): Promise<void> {
    for (const rec of records)
      await tx
        .insert(attendance)
        .values(rec)
        .onConflictDoUpdate({
          target: [attendance.lessonId, attendance.studentId],
          set: {
            status: rec.status,
            lateMinutes: rec.lateMinutes ?? null,
            note: rec.note ?? null,
            markedBy: rec.markedBy,
            markedAt: rec.markedAt ?? this.clock.now(),
            clientMutationId: rec.clientMutationId ?? null,
            updatedAt: this.clock.now(),
          },
        });
  }

  /** Belgilanmagan darslar: o'quvchisi bor guruh; ustozsiz dars ham (o'rinbosar topilmagan). */
  async findUnmarkedLessons(params: { from: string; to: string; branchId?: string }) {
    const conds = [
      eq(lessons.status, 'scheduled'),
      isNull(attendance.id),
      gte(lessons.date, params.from),
      lte(lessons.date, params.to),
      sql`exists (select 1 from ${enrollments} e where e.group_id = ${lessons.groupId}
        and e.start_date <= ${lessons.date}
        and (e.end_date is null or e.end_date >= ${lessons.date}))`,
    ];
    if (params.branchId) conds.push(eq(groups.branchId, params.branchId));

    return this.db
      .select({
        lessonId: lessons.id,
        groupId: lessons.groupId,
        groupName: groups.name,
        courseName: courses.name,
        teacherId: lessons.teacherId,
        teacherName: users.fullName,
        date: lessons.date,
        startTime: lessons.startTime,
        endTime: lessons.endTime,
      })
      .from(lessons)
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .innerJoin(courses, eq(courses.id, groups.courseId))
      .leftJoin(users, eq(users.id, lessons.teacherId))
      .leftJoin(attendance, eq(attendance.lessonId, lessons.id))
      .where(and(...conds))
      .groupBy(lessons.id, groups.id, courses.id, users.id)
      .orderBy(desc(lessons.date), desc(lessons.startTime));
  }

  async findAdminUsers() {
    return this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        telegramId: users.telegramId,
      })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.status, 'active'), inArray(roles.code, ['admin', 'director'])));
  }
}
