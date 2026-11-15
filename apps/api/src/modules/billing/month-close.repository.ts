import { Inject, Injectable } from '@nestjs/common';
import {
  attendance,
  type Database,
  enrollmentFreezes,
  enrollments,
  groups,
  invoiceLines,
  invoices,
  lessons,
} from '@lg/db';
import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface PrevTuition {
  enrollmentId: string;
  groupId: string;
  amount: bigint;
  penaltyConfig: Record<string, unknown> | null;
}

/** BR-2 oy yopish uchun o'tgan oy ma'lumotlari (o'qish; yozish — generator tranzaksiyasida). */
@Injectable()
export class MonthCloseRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** O'tgan oy invoice'idagi o'qish qatorlari (kredit asosi — haqiqatan undirilgan summa). */
  async prevTuition(studentId: string, period: string): Promise<PrevTuition[]> {
    const rows = await this.db
      .select({
        enrollmentId: invoiceLines.enrollmentId,
        groupId: enrollments.groupId,
        amount: invoiceLines.amount,
        penaltyConfig: groups.penaltyConfig,
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .innerJoin(enrollments, eq(enrollments.id, invoiceLines.enrollmentId))
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          eq(invoices.studentId, studentId),
          eq(invoices.period, period),
          ne(invoices.status, 'void'),
          eq(invoiceLines.kind, 'tuition'),
        ),
      );
    return rows.flatMap((r) =>
      r.enrollmentId ? [{ ...r, enrollmentId: r.enrollmentId, amount: BigInt(r.amount) }] : [],
    );
  }

  /**
   * Guruhning oydagi oddiy (regular) darslari: jami (asl jadval, bekor qilinganlar bilan),
   * markaz bekor qilgan va qo'shimcha dars bilan qoplanmaganlar (BR-5 — kredit).
   */
  async lessonCounts(groupId: string, from: string, to: string) {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        cancelled: sql<number>`count(*) filter (where ${lessons.status} = 'cancelled' and ${lessons.compensation} is distinct from 'makeup')::int`,
      })
      .from(lessons)
      .where(
        and(
          eq(lessons.groupId, groupId),
          eq(lessons.kind, 'regular'),
          gte(lessons.date, from),
          lte(lessons.date, to),
        ),
      );
    return { total: Number(row?.total ?? 0), cancelled: Number(row?.cancelled ?? 0) };
  }

  /** BR-9: muzlatish davriga tushgan (bekor qilinmagan) oddiy darslar soni. */
  async frozenLessons(enrollmentId: string, groupId: string, from: string, to: string) {
    const [row] = await this.db
      .select({ n: sql<number>`count(distinct ${lessons.id})::int` })
      .from(lessons)
      .innerJoin(
        enrollmentFreezes,
        and(
          eq(enrollmentFreezes.enrollmentId, enrollmentId),
          lte(enrollmentFreezes.fromDate, lessons.date),
          gte(enrollmentFreezes.toDate, lessons.date),
        ),
      )
      .where(
        and(
          eq(lessons.groupId, groupId),
          eq(lessons.kind, 'regular'),
          ne(lessons.status, 'cancelled'),
          gte(lessons.date, from),
          lte(lessons.date, to),
        ),
      );
    return Number(row?.n ?? 0);
  }

  /** BR-8/10: sababsiz qatnashmaslik va kech qolishlar (≥ chegara daqiqa). */
  async absences(q: {
    studentId: string;
    groupId: string;
    from: string;
    to: string;
    lateMin: number;
  }) {
    const { studentId, groupId, from, to, lateMin } = q;
    const [row] = await this.db
      .select({
        absent: sql<number>`count(*) filter (where ${attendance.status} = 'absent')::int`,
        late: sql<number>`count(*) filter (where ${attendance.status} = 'late' and coalesce(${attendance.lateMinutes}, 0) >= ${lateMin})::int`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .where(
        and(
          eq(attendance.studentId, studentId),
          eq(lessons.groupId, groupId),
          gte(lessons.date, from),
          lte(lessons.date, to),
        ),
      );
    return { absent: Number(row?.absent ?? 0), late: Number(row?.late ?? 0) };
  }
}
