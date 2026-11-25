import { Inject, Injectable } from '@nestjs/common';
import {
  attendance,
  type Database,
  enrollments,
  groups,
  invoiceOutstandingSql,
  invoices,
  lessons,
  students,
} from '@lg/db';
import { and, eq, gte, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import {
  collectionRateBp,
  gradeDropMap,
  minusDays,
  monthValue,
  paidRevenue,
  reachableStudents,
} from './forecasts-history.js';

export interface RawStudentChurnData {
  studentId: string;
  studentName: string;
  studentCode: number;
  groupId: string;
  groupName: string | null;
  attendanceDropPercent: number;
  paymentDelayDays: number;
  gradeDropPercent: number;
  botUnresponsive: boolean;
}

@Injectable()
export class ForecastsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  getMonthValue(branchId: string, period: string) {
    return monthValue(this.db, branchId, period);
  }

  getCollectionRateBp(branchId: string, period: string): Promise<number> {
    return collectionRateBp(this.db, branchId, period);
  }

  /** O'quvchilar bo'yicha ketish xavfi (churn) ma'lumotlarini to'playdi */
  async getStudentsChurnInputs(branchId: string, today: string): Promise<RawStudentChurnData[]> {
    const activeStudents = await this.fetchActiveStudentsWithGroup(branchId, today);
    if (activeStudents.length === 0) return [];

    const studentIds = activeStudents.map((s) => s.id);
    const delaysMap = await this.fetchPaymentDelays(studentIds, today);
    const [reachable, absences, gradeMap] = await Promise.all([
      reachableStudents(this.db, studentIds),
      this.fetchAbsences(studentIds, today),
      gradeDropMap(this.db, studentIds, today),
    ]);

    return activeStudents.map((s) => ({
      studentId: s.id,
      studentName: s.fullName,
      studentCode: Number(s.code),
      groupId: s.groupId,
      groupName: s.groupName,
      // Ma'lumot yo'q — xavf belgisi yo'q (uydirma standart qiymat emas).
      attendanceDropPercent: absences.get(s.id) ?? 0,
      paymentDelayDays: delaysMap.get(s.id) ?? 0,
      gradeDropPercent: gradeMap.get(s.id) ?? 0,
      botUnresponsive: !reachable.has(s.id),
    }));
  }

  private async fetchActiveStudentsWithGroup(branchId: string, today: string) {
    return this.db
      .select({
        id: students.id,
        code: students.code,
        fullName: students.fullName,
        groupId: groups.id,
        groupName: groups.name,
      })
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          eq(students.branchId, branchId),
          isNull(students.archivedAt),
          lte(enrollments.startDate, today),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${today})`,
        ),
      );
  }

  /** Oxirgi 4 haftada kelmagan darslar ulushi, % (Q-105). */
  private async fetchAbsences(studentIds: string[], today: string): Promise<Map<string, number>> {
    const fourWeeksAgo = minusDays(today, 28);

    const rows = await this.db
      .select({
        studentId: attendance.studentId,
        total: sql<number>`count(*)::int`,
        absent: sql<number>`count(*) filter (where ${attendance.status} = 'absent')::int`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .where(
        and(
          inArray(attendance.studentId, studentIds),
          gte(lessons.date, fourWeeksAgo),
          lte(lessons.date, today),
        ),
      )
      .groupBy(attendance.studentId);

    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.total > 0) {
        const drop = Math.round((r.absent / r.total) * 100);
        map.set(r.studentId, drop);
      }
    }
    return map;
  }

  private async fetchPaymentDelays(
    studentIds: string[],
    today: string,
  ): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        studentId: invoices.studentId,
        minDueDate: sql<string>`min(${invoices.dueDate})`,
      })
      .from(invoices)
      .where(
        and(
          inArray(invoices.studentId, studentIds),
          inArray(invoices.status, ['open', 'partially_paid']),
          sql`${invoices.dueDate} < ${today}`,
          // BR-20: to'lab bo'lingan hisob kechikish emas
          sql`${invoiceOutstandingSql(invoices.id, invoices.total)} > 0`,
        ),
      )
      .groupBy(invoices.studentId);

    const map = new Map<string, number>();
    for (const r of rows) {
      const diffMs = new Date(today).getTime() - new Date(r.minDueDate).getTime();
      map.set(r.studentId, Math.max(0, Math.floor(diffMs / 86400000)));
    }
    return map;
  }

  /** Guruh to'lishi ma'lumotlari */
  async getGroupOccupancies(branchId: string, today: string) {
    const activeGroups = await this.db
      .select({
        id: groups.id,
        name: groups.name,
        capacity: groups.maxStudents,
        currentActive: sql<number>`count(${enrollments.id})::int`,
      })
      .from(groups)
      .leftJoin(
        enrollments,
        and(
          eq(enrollments.groupId, groups.id),
          lte(enrollments.startDate, today),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${today})`,
        ),
      )
      .where(and(eq(groups.branchId, branchId), sql`${groups.status} <> 'finished'`))
      .groupBy(groups.id, groups.name, groups.maxStudents);

    return activeGroups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      capacity: Number(g.capacity),
      currentActive: Number(g.currentActive),
    }));
  }

  /** Oraliqdagi haqiqiy tushum (backtest). */
  getPaidRevenue(branchId: string, start: string, endExclusive: string): Promise<bigint> {
    return paidRevenue(this.db, branchId, start, endExclusive);
  }

  async getActualChurnCount(
    branchId: string,
    monthStart: string,
    endExclusive: string,
  ): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(distinct ${enrollments.studentId})::int` })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          eq(groups.branchId, branchId),
          // Ko'chgan yoki kursni tugatgan — ketgan emas
          eq(enrollments.endReason, 'left'),
          gte(enrollments.endDate, monthStart),
          lt(enrollments.endDate, endExclusive),
        ),
      );
    return Number(rows[0]?.count ?? 0);
  }
}
