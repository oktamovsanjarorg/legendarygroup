import { Inject, Injectable } from '@nestjs/common';
import {
  attendance,
  type Database,
  enrollments,
  grades,
  groups,
  lessons,
  students,
  testResults,
  tests,
} from '@lg/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface GroupStudentRow {
  studentId: string;
  studentName: string;
  studentCode: string;
}

export interface AttendanceStatRow {
  studentId: string;
  totalLessons: number;
  attendedLessons: number;
}

export interface GradeStatRow {
  studentId: string;
  averageGrade: number;
}

export interface TestStatRow {
  studentId: string;
  averageTestScorePercent: number;
}

@Injectable()
export class ProgressRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** Guruh ma'lumotlarini topish */
  async findGroupById(groupId: string) {
    const [row] = await this.db
      .select({ id: groups.id, name: groups.name, branchId: groups.branchId })
      .from(groups)
      .where(eq(groups.id, groupId));
    return row ?? null;
  }

  /** Guruhning faol o'quvchilari */
  async findGroupStudents(groupId: string): Promise<GroupStudentRow[]> {
    const rows = await this.db
      .select({
        studentId: students.id,
        studentName: students.fullName,
        studentCode: students.code,
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(eq(enrollments.groupId, groupId))
      .orderBy(students.fullName);

    return rows.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      studentCode: `LG-${r.studentCode}`,
    }));
  }

  /** Guruh o'quvchilarining davomat statistikasi */
  async getGroupAttendanceStats(groupId: string): Promise<Map<string, AttendanceStatRow>> {
    const rows = await this.db
      .select({
        studentId: attendance.studentId,
        totalLessons: sql<number>`count(*)::int`,
        attendedLessons: sql<number>`count(case when ${attendance.status} in ('present', 'late') then 1 end)::int`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .where(eq(lessons.groupId, groupId))
      .groupBy(attendance.studentId);

    return new Map(rows.map((r) => [r.studentId, r]));
  }

  /** Guruh o'quvchilarining darsdagi baholar statistikasi */
  async getGroupGradesStats(groupId: string): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        studentId: grades.studentId,
        avgGrade: sql<number>`round(avg(${grades.value})::numeric, 1)::float`,
      })
      .from(grades)
      .innerJoin(lessons, eq(lessons.id, grades.lessonId))
      .where(eq(lessons.groupId, groupId))
      .groupBy(grades.studentId);

    return new Map(rows.map((r) => [r.studentId, Number(r.avgGrade)]));
  }

  /** Guruh o'quvchilarining e'lon qilingan testlar statistikasi */
  async getGroupTestStats(groupId: string): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        studentId: testResults.studentId,
        avgPercent: sql<number>`round(avg((${testResults.score} * 100.0) / nullif(${tests.maxScore}, 0))::numeric, 1)::float`,
      })
      .from(testResults)
      .innerJoin(tests, eq(tests.id, testResults.testId))
      .where(and(eq(tests.groupId, groupId), eq(tests.status, 'published')))
      .groupBy(testResults.studentId);

    return new Map(rows.map((r) => [r.studentId, Number(r.avgPercent)]));
  }

  /** O'quvchining so'nggi davomat yozuvlari */
  async getStudentAttendanceTrend(studentId: string, groupId: string) {
    return this.db
      .select({
        lessonId: attendance.lessonId,
        date: lessons.date,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .where(and(eq(attendance.studentId, studentId), eq(lessons.groupId, groupId)))
      .orderBy(desc(lessons.date))
      .limit(30);
  }

  /** O'quvchining so'nggi baholar yozuvlari */
  async getStudentGradesTrend(studentId: string, groupId: string) {
    return this.db
      .select({
        lessonId: grades.lessonId,
        date: lessons.date,
        kind: grades.kind,
        value: grades.value,
      })
      .from(grades)
      .innerJoin(lessons, eq(lessons.id, grades.lessonId))
      .where(and(eq(grades.studentId, studentId), eq(lessons.groupId, groupId)))
      .orderBy(desc(lessons.date))
      .limit(50);
  }

  /** O'quvchining e'lon qilingan test natijalari */
  async getStudentTestResults(studentId: string, groupId: string) {
    const rows = await this.db
      .select({
        testId: tests.id,
        title: tests.title,
        date: tests.date,
        score: testResults.score,
        maxScore: tests.maxScore,
        percent: sql<number>`round((${testResults.score} * 100.0) / nullif(${tests.maxScore}, 0)::numeric, 1)::float`,
      })
      .from(testResults)
      .innerJoin(tests, eq(tests.id, testResults.testId))
      .where(
        and(
          eq(testResults.studentId, studentId),
          eq(tests.groupId, groupId),
          eq(tests.status, 'published'),
        ),
      )
      .orderBy(desc(tests.date));

    return rows.map((r) => ({
      testId: r.testId,
      title: r.title,
      date: r.date,
      score: r.score,
      maxScore: r.maxScore,
      percent: Number(r.percent),
    }));
  }

  /** O'quvchi qatnashadigan asosiy guruhni topish */
  async findStudentPrimaryGroup(studentId: string) {
    const [row] = await this.db
      .select({ groupId: enrollments.groupId, groupName: groups.name })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(eq(enrollments.studentId, studentId))
      .limit(1);
    return row ?? null;
  }
}
