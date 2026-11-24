import { enrollments, groups, type Transaction } from '@lg/db';
import { and, eq, gte, isNull, lte, ne, or } from 'drizzle-orm';

/** Q-102: to'xtatilgan va oy boshlanishidan oldin yakunlangan guruhga hisob yozilmaydi. */
export const billableGroup = (monthStart: string) =>
  and(
    ne(groups.status, 'paused'),
    or(ne(groups.status, 'finished'), isNull(groups.endDate), gte(groups.endDate, monthStart)),
  );

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
