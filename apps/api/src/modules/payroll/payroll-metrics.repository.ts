import { Inject, Injectable } from '@nestjs/common';
import { type Database } from '@lg/db';
import { tashkentMonthRange, type TeacherLessonMetrics } from '@lg/domain';
import { sql, type SQL } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

/** Shartnoma qaysi guruhlarga tegishli: bitta guruh yoki "qolgan hammasi". */
export interface GroupScope {
  only?: string;
  exclude: string[];
}

/** `YYYY-MM` → oyning birinchi kuni va keyingi oyning birinchi kuni (`date` taqqoslash uchun). */
export function periodDays(period: string): { first: string; next: string } {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { first: `${period}-01`, next };
}

function scopeSql(column: SQL, scope: GroupScope): SQL {
  if (scope.only) return sql`AND ${column} = ${scope.only}`;
  if (scope.exclude.length === 0) return sql``;
  return sql`AND ${column} NOT IN (${sql.join(
    scope.exclude.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`;
}

const toInt = (v: unknown): number => Number(v ?? 0);

/**
 * Oylik hisobi uchun o'qish so'rovlari (BR-23…BR-25). Ustoz guruhi — `group_teachers.role = 'main'`
 * va tayinlov muddati (`from_date`…`to_date`) dars/to'lov sanasini qamraydi.
 */
@Injectable()
export class PayrollMetricsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async lessonMetrics(
    teacherId: string,
    period: string,
    scope: GroupScope,
  ): Promise<Omit<TeacherLessonMetrics, 'substituteLessonsTaughtAsSub'>> {
    const { first, next } = periodDays(period);
    const rows = await this.db.execute<{ total: number; by_others: number }>(sql`
      SELECT count(DISTINCT l.id)::int AS total,
             count(DISTINCT l.id) FILTER (WHERE l.teacher_id <> ${teacherId})::int AS by_others
      FROM lessons l
      WHERE l.date >= ${first} AND l.date < ${next} AND l.status <> 'cancelled'
        ${scopeSql(sql`l.group_id`, scope)}
        AND EXISTS (
          SELECT 1 FROM group_teachers gt
          WHERE gt.group_id = l.group_id AND gt.teacher_id = ${teacherId} AND gt.role = 'main'
            AND gt.from_date <= l.date AND (gt.to_date IS NULL OR gt.to_date >= l.date)
        )
    `);
    const row = rows[0];
    return {
      totalScheduledLessons: toInt(row?.total),
      substituteLessonsTaughtByOthers: toInt(row?.by_others),
    };
  }

  async substituteLessonsTaught(teacherId: string, period: string): Promise<number> {
    const { first, next } = periodDays(period);
    const rows = await this.db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM lessons l
      WHERE l.teacher_id = ${teacherId} AND l.is_substitute
        AND l.date >= ${first} AND l.date < ${next} AND l.status <> 'cancelled'
    `);
    return toInt(rows[0]?.n);
  }

  /**
   * BR-24: shu oyda (Toshkent) ustoz guruhlariga taqsimlangan to'lovlar.
   * Shu oy oxirigacha storno qilingan to'lov hisobga olinmaydi; oldingi oy to'lovi shu oyda
   * storno qilinsa — shu oy bazasidan ayriladi (yopilgan hisob o'zgarmaydi, BR-27).
   */
  async collectedBase(teacherId: string, period: string, scope: GroupScope): Promise<bigint> {
    const range = tashkentMonthRange(period);
    const start = sql`${range.start.toISOString()}::timestamptz`;
    const end = sql`${range.end.toISOString()}::timestamptz`;
    const teacherOwns = sql`EXISTS (
      SELECT 1 FROM group_teachers gt
      WHERE gt.group_id = e.group_id AND gt.teacher_id = ${teacherId} AND gt.role = 'main'
        AND gt.from_date <= (p.paid_at AT TIME ZONE 'Asia/Tashkent')::date
        AND (gt.to_date IS NULL OR gt.to_date >= (p.paid_at AT TIME ZONE 'Asia/Tashkent')::date)
    ) ${scopeSql(sql`e.group_id`, scope)}`;
    const allocations = sql`payment_allocations pa
      JOIN payments p ON p.id = pa.payment_id
      JOIN invoice_lines il ON il.id = pa.invoice_line_id
      JOIN enrollments e ON e.id = il.enrollment_id`;
    const rows = await this.db.execute<{ total: string }>(sql`
      SELECT (
        COALESCE((SELECT sum(pa.amount) FROM ${allocations}
          WHERE p.paid_at >= ${start} AND p.paid_at < ${end} AND ${teacherOwns}
            AND NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = p.id AND r.paid_at < ${end})
        ), 0)
        - COALESCE((SELECT sum(pa.amount) FROM ${allocations}
          JOIN payments r ON r.reversal_of = p.id
          WHERE r.paid_at >= ${start} AND r.paid_at < ${end} AND p.paid_at < ${start} AND ${teacherOwns}
        ), 0)
      )::text AS total
    `);
    return BigInt(rows[0]?.total ?? '0');
  }
}
