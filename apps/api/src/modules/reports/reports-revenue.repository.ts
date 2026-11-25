import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '@lg/db';
import { sql, type SQL } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface RevenueRowItem {
  id: string;
  name: string;
  totalRevenue: bigint;
  paymentCount: number;
  studentCount: number;
}

export interface RevenueReport {
  items: RevenueRowItem[];
  totalRevenue: bigint;
  totalPayments: number;
}

export interface DateFilter {
  /** Toshkent kuni (`YYYY-MM-DD`), ikkala chegara kiradi. */
  from?: string;
  to?: string;
}

interface Raw extends Record<string, unknown> {
  id: string | null;
  name: string | null;
  total: string;
  payments: number;
  students: number;
}

const UNASSIGNED = 'unassigned';
const toItem = (r: Raw): RevenueRowItem => ({
  id: r.id ?? UNASSIGNED,
  name: r.name ?? '',
  totalRevenue: BigInt(r.total),
  paymentCount: Number(r.payments),
  studentCount: Number(r.students),
});

/** Kesim → kalit va nom ustunlari. Ustoz — to'lov kunidagi asosiy ustoz. */
const DIMENSION: Record<'course' | 'group' | 'teacher', { id: SQL; name: SQL }> = {
  course: { id: sql`c.id`, name: sql`c.name` },
  group: { id: sql`g.id`, name: sql`g.name` },
  teacher: { id: sql`tch.id`, name: sql`tch.full_name` },
};

/**
 * Daromad (FR-DASH-2): sof tushum — storno va qaytarish ayriladi (P&L bilan bir xil). `counted` —
 * bekor qilinmagan kirim (son ustunlari uchun).
 */
@Injectable()
export class ReportsRevenueRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  private source(branchId: string, { from, to }: DateFilter): SQL {
    return sql`SELECT p.id, p.student_id, p.amount, p.paid_at,
        coalesce(p.reversal_of, p.id) AS src,
        (p.paid_at AT TIME ZONE 'Asia/Tashkent')::date AS day,
        (p.amount > 0 AND NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = p.id)) AS counted
      FROM payments p
      WHERE p.branch_id = ${branchId}
        ${from ? sql`AND p.paid_at >= (${from}::date::timestamp AT TIME ZONE 'Asia/Tashkent')` : sql``}
        ${to ? sql`AND p.paid_at < ((${to}::date + 1)::timestamp AT TIME ZONE 'Asia/Tashkent')` : sql``}`;
  }

  async byMonth(branchId: string, filter: DateFilter): Promise<RevenueReport> {
    const rows = await this.db.execute<Raw>(sql`
      SELECT to_char(x.day, 'YYYY-MM') AS id, to_char(x.day, 'YYYY-MM') AS name,
        sum(x.amount)::text AS total,
        (count(*) FILTER (WHERE x.counted))::int AS payments,
        (count(DISTINCT x.student_id) FILTER (WHERE x.counted))::int AS students
      FROM (${this.source(branchId, filter)}) x
      GROUP BY 1 ORDER BY 1 DESC`);
    const items = [...rows].map(toItem);
    return {
      items,
      totalRevenue: items.reduce((s, i) => s + i.totalRevenue, 0n),
      totalPayments: items.reduce((s, i) => s + i.paymentCount, 0),
    };
  }

  /** Kurs/guruh/ustoz: to'lov taqsimoti bo'yicha; storno o'z to'lovining taqsimotini qaytaradi. */
  async byDimension(
    branchId: string,
    dimension: 'course' | 'group' | 'teacher',
    filter: DateFilter,
  ): Promise<RevenueReport> {
    const { id, name } = DIMENSION[dimension];
    const source = this.source(branchId, filter);
    const rows = await this.db.execute<Raw>(sql`
      SELECT ${id} AS id, ${name} AS name,
        sum(sign(x.amount) * pa.amount)::bigint::text AS total,
        (count(DISTINCT x.id) FILTER (WHERE x.counted))::int AS payments,
        (count(DISTINCT x.student_id) FILTER (WHERE x.counted))::int AS students
      FROM (${source}) x
      JOIN payment_allocations pa ON pa.payment_id = x.src
      JOIN invoice_lines il ON il.id = pa.invoice_line_id
      LEFT JOIN enrollments e ON e.id = il.enrollment_id
      LEFT JOIN groups g ON g.id = e.group_id
      LEFT JOIN courses c ON c.id = g.course_id
      LEFT JOIN LATERAL (
        SELECT u.id, u.full_name FROM group_teachers gt JOIN users u ON u.id = gt.teacher_id
        WHERE gt.group_id = g.id AND gt.role = 'main' AND gt.from_date <= x.day
          AND (gt.to_date IS NULL OR gt.to_date >= x.day)
        ORDER BY gt.from_date DESC LIMIT 1
      ) tch ON true
      GROUP BY 1, 2 ORDER BY sum(sign(x.amount) * pa.amount) DESC`);
    const all = [...rows].map(toItem);
    const total = await this.byMonth(branchId, filter);
    const items = all.filter((i) => i.id !== UNASSIGNED);
    const assigned = items.reduce((s, i) => s + i.totalRevenue, 0n);
    // Avans, guruhsiz qator va qaytarish: jami oylik hisobot bilan teng chiqishi uchun alohida qator.
    const rest = total.totalRevenue - assigned;
    if (rest !== 0n)
      items.push({
        id: UNASSIGNED,
        name: '',
        totalRevenue: rest,
        paymentCount: 0,
        studentCount: 0,
      });
    return { items, totalRevenue: total.totalRevenue, totalPayments: total.totalPayments };
  }
}
