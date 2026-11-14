import { Inject, Injectable } from '@nestjs/common';
import {
  attendance,
  type Database,
  enrollments,
  grades,
  guardians,
  invoiceOutstandingSql,
  invoices,
  lessons,
  studentGuardians,
  students,
  teacherComments,
  testResults,
  tests,
} from '@lg/db';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface GuardianStudentLink {
  guardianUserId: string;
  guardianName: string;
  studentId: string;
  studentName: string;
  branchId: string;
}

@Injectable()
export class ParentDigestRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** Barcha ota-onalar va ularning farzandlari bog'lanishlarini olish */
  async findAllGuardianStudents(): Promise<GuardianStudentLink[]> {
    const rows = await this.db
      .select({
        guardianUserId: guardians.userId,
        guardianName: guardians.fullName,
        studentId: studentGuardians.studentId,
        studentName: students.fullName,
        branchId: students.branchId,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .innerJoin(students, eq(students.id, studentGuardians.studentId))
      .where(sql`${guardians.userId} IS NOT NULL`);

    return rows
      .filter((r): r is typeof r & { guardianUserId: string } => Boolean(r.guardianUserId))
      .map((r) => ({
        guardianUserId: r.guardianUserId,
        guardianName: r.guardianName,
        studentId: r.studentId,
        studentName: r.studentName,
        branchId: r.branchId,
      }));
  }

  /** O'quvchining davr ichidagi davomat ko'rsatkichi */
  async getStudentAttendance(studentId: string, from: string, to: string) {
    const [row] = await this.db
      .select({
        totalLessons: sql<number>`count(*)::int`,
        attendedLessons: sql<number>`count(case when ${attendance.status} in ('present', 'late') then 1 end)::int`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .where(
        and(eq(attendance.studentId, studentId), gte(lessons.date, from), lte(lessons.date, to)),
      );

    return {
      totalLessons: Number(row?.totalLessons ?? 0),
      attendedLessons: Number(row?.attendedLessons ?? 0),
    };
  }

  /** O'quvchining davr ichidagi o'rtacha bahosi */
  async getStudentAverageGrade(studentId: string, from: string, to: string): Promise<number> {
    const [row] = await this.db
      .select({
        avgGrade: sql<number>`round(avg(${grades.value})::numeric, 1)::float`,
      })
      .from(grades)
      .innerJoin(lessons, eq(lessons.id, grades.lessonId))
      .where(and(eq(grades.studentId, studentId), gte(lessons.date, from), lte(lessons.date, to)));

    return Number(row?.avgGrade ?? 0);
  }

  /** O'quvchining davr ichidagi ustoz izohlari (faqat guardian ko'rinishidagilari) */
  async getStudentComments(studentId: string, from: string, to: string): Promise<string[]> {
    const rows = await this.db
      .select({ text: teacherComments.text })
      .from(teacherComments)
      .leftJoin(lessons, eq(lessons.id, teacherComments.lessonId))
      .where(
        and(
          eq(teacherComments.studentId, studentId),
          eq(teacherComments.visibility, 'guardian'),
          gte(sql`to_char(${teacherComments.createdAt}, 'YYYY-MM-DD')`, from),
          lte(sql`to_char(${teacherComments.createdAt}, 'YYYY-MM-DD')`, to),
        ),
      )
      .orderBy(desc(teacherComments.createdAt))
      .limit(5);

    return rows.map((r) => r.text);
  }

  /** O'quvchining joriy to'lov holati va qarzi */
  async getStudentBillingStatus(
    studentId: string,
    today: string,
  ): Promise<{ status: 'paid' | 'pending' | 'overdue'; debtAmount: bigint }> {
    const openInvoices = await this.db
      .select({
        total: invoiceOutstandingSql(invoices.id, invoices.total),
        dueDate: invoices.dueDate,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.studentId, studentId),
          inArray(invoices.status, ['open', 'partially_paid']),
        ),
      );

    if (openInvoices.length === 0) {
      return { status: 'paid', debtAmount: 0n };
    }

    let debt = 0n;
    let hasOverdue = false;
    for (const inv of openInvoices) {
      debt += BigInt(inv.total);
      if (inv.dueDate < today) hasOverdue = true;
    }

    return {
      status: hasOverdue ? 'overdue' : 'pending',
      debtAmount: debt,
    };
  }

  /** O'quvchining davr ichidagi test natijalari */
  async getStudentTestResults(studentId: string, from: string, to: string) {
    const rows = await this.db
      .select({
        title: tests.title,
        score: testResults.score,
        maxScore: tests.maxScore,
        percent: sql<number>`round((${testResults.score} * 100.0) / nullif(${tests.maxScore}, 0)::numeric, 1)::float`,
      })
      .from(testResults)
      .innerJoin(tests, eq(tests.id, testResults.testId))
      .where(
        and(
          eq(testResults.studentId, studentId),
          eq(tests.status, 'published'),
          gte(tests.date, from),
          lte(tests.date, to),
        ),
      )
      .orderBy(desc(tests.date));

    return rows.map((r) => ({
      title: r.title,
      score: r.score,
      maxScore: r.maxScore,
      percent: Number(r.percent),
    }));
  }

  /** O'quvchining asosiy guruh ID sini topish */
  async findStudentGroupId(studentId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ groupId: enrollments.groupId })
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId))
      .limit(1);
    return row?.groupId ?? null;
  }
}
