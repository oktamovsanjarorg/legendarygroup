import {
  type Database,
  enrollments,
  grades,
  groups,
  invoiceOutstandingSql,
  invoices,
  lessons,
  payments,
  students,
} from '@lg/db';
import { and, eq, gte, inArray, isNull, lt, lte, ne, or, sql } from 'drizzle-orm';

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

/** Oraliqdagi sof tushum: storno va qaytarish ayriladi (P&L, hisobot bilan bir xil; Toshkent kuni). */
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
    .where(and(eq(payments.branchId, branchId), gte(day, start), lt(day, endExclusive)));
  return BigInt(row?.total ?? '0');
}

/**
 * Oy qiymati: o'sha oyda o'qiydigan yozilishlar (rejadagi chiqish/kirish hisobga olinadi) narxi,
 * doimiy chegirma bilan (BR-18). To'xtatilgan va tugagan guruhga hisob yozilmaydi — kirmaydi.
 */
export async function monthValue(
  db: Database,
  branchId: string,
  period: string,
): Promise<{ count: number; totalValue: bigint }> {
  const first = `${period}-01`;
  const next = `${addMonths(period, 1)}-01`;
  const [row] = await db
    .select({
      count: sql<number>`count(${enrollments.id})::int`,
      total: sql<string>`coalesce(sum(${groups.monthlyPrice} * (100 - coalesce(${enrollments.discountPercent}, 0)) / 100), 0)::text`,
    })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(
      and(
        eq(groups.branchId, branchId),
        inArray(groups.status, ['forming', 'active']),
        isNull(students.archivedAt),
        lt(enrollments.startDate, next),
        or(isNull(enrollments.endDate), gte(enrollments.endDate, first)),
      ),
    );
  return { count: Number(row?.count ?? 0), totalValue: BigInt(row?.total ?? '0') };
}

const RATE_MONTHS = 6;
/** Hali yig'ilish tarixi yo'q — ehtiyotkor taxmin. */
const DEFAULT_RATE_BP = 9000;

/** Yig'ilish koeffitsienti: `period`dan oldingi 6 oy hisoblarining to'langan ulushi (void — yo'q). */
export async function collectionRateBp(
  db: Database,
  branchId: string,
  period: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.total}), 0)::text`,
      paid: sql<string>`coalesce(sum(${invoices.total} - ${invoiceOutstandingSql(invoices.id, invoices.total)}), 0)::text`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.branchId, branchId),
        ne(invoices.status, 'void'),
        gte(invoices.period, addMonths(period, -RATE_MONTHS)),
        lt(invoices.period, period),
      ),
    );
  const total = BigInt(row?.total ?? '0');
  if (total <= 0n) return DEFAULT_RATE_BP;
  return Math.min(10_000, Number((BigInt(row?.paid ?? '0') * 10_000n) / total));
}

/**
 * BR-36: ota-onaga bot orqali yetib bo'lmaydi — birortasi ham ulanmagan yoki oxirgi xabari
 * bloklangan. Kiritilgan ota-ona yo'q bo'lsa ham (natijada qator yo'q — `true`).
 */
export async function reachableStudents(db: Database, studentIds: string[]): Promise<Set<string>> {
  const rows = await db.execute<{ student_id: string }>(sql`
    SELECT DISTINCT sg.student_id
    FROM student_guardians sg
    JOIN guardians g ON g.id = sg.guardian_id
    JOIN users u ON u.id = g.user_id AND u.telegram_id IS NOT NULL
    WHERE sg.student_id IN (${sql.join(
      studentIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
      AND coalesce((SELECT n.status FROM notifications n WHERE n.user_id = u.id
        ORDER BY n.created_at DESC LIMIT 1), 'sent') <> 'blocked'`);
  return new Set([...rows].map((r) => r.student_id));
}
