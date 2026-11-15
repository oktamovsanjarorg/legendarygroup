import { type Database, grades, lessons, payments } from '@lg/db';
import { and, eq, gte, inArray, isNull, lt, lte, sql } from 'drizzle-orm';

/** `YYYY-MM-DD` − n kun (UTC sana arifmetikasi; vaqt zonasi ta'sir qilmaydi). */
export const minusDays = (ymd: string, n: number): string =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

/** `YYYY-MM` + k oy (`setMonth` emas — 31-sana muammosi yo'q). */
export const addMonths = (period: string, k: number): string => {
  const idx = Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1 + k;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
};

/**
 * BR-36 "baho tendensiyasi pasayishi": oxirgi 4 hafta o'rtachasi oldingi 4 haftaga nisbatan
 * necha % past (0–100). Ikkala davrda baho bo'lmasa — pasayish yo'q (0).
 */
export async function gradeDropMap(
  db: Database,
  studentIds: string[],
  today: string,
): Promise<Map<string, number>> {
  const mid = minusDays(today, 28);
  const recent = sql`${lessons.date} > ${mid}`;
  const rows = await db
    .select({
      studentId: grades.studentId,
      recent: sql<number | null>`avg(${grades.value}) filter (where ${recent})::float`,
      prev: sql<number | null>`avg(${grades.value}) filter (where not (${recent}))::float`,
    })
    .from(grades)
    .innerJoin(lessons, eq(lessons.id, grades.lessonId))
    .where(
      and(
        inArray(grades.studentId, studentIds),
        gte(lessons.date, minusDays(today, 56)),
        lte(lessons.date, today),
      ),
    )
    .groupBy(grades.studentId);
  const map = new Map<string, number>();
  for (const r of rows) {
    const [now, before] = [Number(r.recent ?? NaN), Number(r.prev ?? NaN)];
    if (!(before > 0) || Number.isNaN(now) || now >= before) continue;
    map.set(r.studentId, Math.min(100, Math.round(((before - now) / before) * 100)));
  }
  return map;
}

/** Oraliqdagi haqiqiy tushum: musbat, storno qilinmagan to'lovlar (Toshkent sanasi). */
export async function paidRevenue(
  db: Database,
  branchId: string,
  start: string,
  endExclusive: string,
): Promise<bigint> {
  const day = sql`(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent')::date`;
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)::text` })
    .from(payments)
    .where(
      and(
        eq(payments.branchId, branchId),
        sql`${payments.amount} > 0`,
        isNull(payments.reversalOf),
        gte(day, start),
        lt(day, endExclusive),
      ),
    );
  return BigInt(row?.total ?? '0');
}
