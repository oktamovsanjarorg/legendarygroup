import { Inject, Injectable } from '@nestjs/common';
import type { PaymentHistory, PaymentHistoryItem, PaymentHistoryQueryInput } from '@lg/contracts';
import { type Database, payments, receiptCancellations, receipts, students } from '@lg/db';
import { tashkentDayRange } from '@lg/domain';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { StudentScopeService } from '../students/index.js';

const kindOf = (amount: bigint, reversalOf: string | null): PaymentHistoryItem['kind'] => {
  if (reversalOf) return 'reversal';
  return amount < 0n ? 'refund' : 'payment';
};

/** MS-24 (T-153): markazning barcha to'lovlari — faqat markazni to'liq ko'radigan xodimga. */
@Injectable()
export class PaymentHistoryService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
  ) {}

  async list(user: RequestUser, q: PaymentHistoryQueryInput): Promise<PaymentHistory> {
    this.studentScope.assertUnrestricted(user);
    const period = and(
      gte(payments.paidAt, tashkentDayRange(q.from).start),
      lt(payments.paidAt, tashkentDayRange(q.to).end),
      q.method ? eq(payments.method, q.method) : undefined,
    );
    const after = q.cursor
      ? sql`(${payments.paidAt}, ${payments.id}) < (select c.paid_at, c.id from payments c where c.id = ${q.cursor})`
      : undefined;
    const rows = await this.db
      .select({
        p: payments,
        student: students.fullName,
        receiptNumber: receipts.number,
        cancelledId: receiptCancellations.receiptId,
      })
      .from(payments)
      .innerJoin(students, eq(students.id, payments.studentId))
      .leftJoin(receipts, eq(receipts.paymentId, payments.id))
      .leftJoin(receiptCancellations, eq(receiptCancellations.receiptId, receipts.id))
      .where(and(period, after))
      .orderBy(desc(payments.paidAt), desc(payments.id))
      .limit(q.limit + 1);
    const [sum] = await this.db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)::text` })
      .from(payments)
      .where(period);
    const page = rows.slice(0, q.limit);
    return {
      items: page.map((r) => ({
        id: r.p.id,
        studentId: r.p.studentId,
        student: r.student,
        kind: kindOf(r.p.amount, r.p.reversalOf),
        amount: r.p.amount.toString(),
        method: r.p.method,
        paidAt: r.p.paidAt.toISOString(),
        receiptNumber: r.receiptNumber,
        cancelled: r.cancelledId !== null,
      })),
      total: sum?.total ?? '0',
      nextCursor: rows.length > q.limit ? (page.at(-1)?.p.id ?? null) : null,
    };
  }
}
