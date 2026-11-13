import { Inject, Injectable } from '@nestjs/common';
import {
  attendance,
  type AttendanceRow,
  courses,
  type Database,
  enrollments,
  groups,
  lessons,
  type NewAttendanceRow,
  roles,
  students,
  userRoles,
  users,
} from '@lg/db';
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface EnrichedAttendanceRow extends AttendanceRow {
  studentName: string;
  studentCode: number;
  markedByName: string;
}

export interface ExpectedStudentRow {
  id: string;
  fullName: string;
  code: string;
}

@Injectable()
export class AttendanceRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

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

  async upsertAttendanceBatch(records: NewAttendanceRow[]): Promise<void> {
    if (records.length === 0) return;

    await this.db.transaction(async (tx) => {
      for (const rec of records) {
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
              markedAt: rec.markedAt ?? new Date(),
              clientMutationId: rec.clientMutationId ?? null,
              updatedAt: new Date(),
            },
          });
      }
    });
  }

  async findUnmarkedLessons(params: { date?: string; branchId?: string }) {
    const conds = [eq(lessons.status, 'scheduled'), isNull(attendance.id)];
    if (params.date) {
      conds.push(eq(lessons.date, params.date));
    } else {
      conds.push(lte(lessons.date, sql`CURRENT_DATE`));
    }
    if (params.branchId) {
      conds.push(eq(groups.branchId, params.branchId));
    }

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
      .innerJoin(users, eq(users.id, lessons.teacherId))
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
