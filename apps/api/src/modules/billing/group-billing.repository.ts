import { enrollments, groups, type Transaction } from '@lg/db';
import { and, eq, gte, isNull, lte, ne, or, sql } from 'drizzle-orm';

/** Q-102: to'xtatilgan va oy boshlanishidan oldin yakunlangan guruhga hisob yozilmaydi. */
export const billableGroup = (monthStart: string) =>
  and(
    ne(groups.status, 'paused'),
    or(ne(groups.status, 'finished'), isNull(groups.endDate), gte(groups.endDate, monthStart)),
  );

/**
 * Q-103: oy o'rtasida ko'chirilgan — shu oy eski guruhda to'liq hisoblangan (BR-4), yangi guruh
 * qatori keyingi oydan. Aks holda oldindan rejalangan ko'chirishda oy ikki marta yozilardi.
 */
export const notTransferredIn = (monthStart: string) => sql`not (
  ${enrollments.startDate} > ${monthStart} and exists (
    select 1 from ${enrollments} prev
    where prev.student_id = ${enrollments.studentId}
      and prev.end_reason = 'transferred'
      and prev.end_date = ${enrollments.startDate} - 1
      and prev.end_date >= ${monthStart}))`;

/** Guruhning shu kundagi a'zoliklari. */
export async function openEnrollmentIds(
  tx: Transaction,
  groupId: string,
  on: string,
): Promise<string[]> {
  const rows = await tx
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.groupId, groupId),
        lte(enrollments.startDate, on),
        or(isNull(enrollments.endDate), gte(enrollments.endDate, on)),
      ),
    );
  return rows.map((r) => r.id);
}
