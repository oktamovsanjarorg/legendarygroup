import { Inject, Injectable } from '@nestjs/common';
import type { CashDay } from '@lg/contracts';
import { cashClosings, type Database, payments, receipts, students, users } from '@lg/db';
import { tashkentDayRange } from '@lg/domain';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { StornoCashService } from './storno-cash.service.js';

const BRANCH = '01900000-0000-7000-8000-000000000001';

/**
 * W-16 kassa kuni (FR-PAY-10): `expectedCash` — `closeCash` ishlatadigan aynan o'sha yig'indi
 * (StornoCashService), ro'yxat — shu kunning naqd to'lovlari va stornolari.
 */
@Injectable()
export class CashDayService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StornoCashService) private readonly stornoCash: StornoCashService,
  ) {}

  async day(date: string): Promise<CashDay> {
    const { start, end } = tashkentDayRange(date);
    const rows = await this.db
      .select({
        id: payments.id,
        paidAt: payments.paidAt,
        student: students.fullName,
        amount: payments.amount,
        receiptNumber: receipts.number,
      })
      .from(payments)
      .innerJoin(students, eq(students.id, payments.studentId))
      .leftJoin(receipts, eq(receipts.paymentId, payments.id))
      .where(
        and(
          eq(payments.branchId, BRANCH),
          eq(payments.method, 'cash'),
          gte(payments.paidAt, start),
          lt(payments.paidAt, end),
        ),
      )
      .orderBy(asc(payments.paidAt));
    const [closed] = await this.db
      .select({ closing: cashClosings, by: users.fullName })
      .from(cashClosings)
      .leftJoin(users, eq(users.id, cashClosings.closedBy))
      .where(and(eq(cashClosings.branchId, BRANCH), eq(cashClosings.date, date)));
    const { expectedCash } = await this.stornoCash.getExpectedCash(date);
    return {
      date,
      expectedCash,
      payments: rows.map((r) => ({
        id: r.id,
        paidAt: r.paidAt.toISOString(),
        student: r.student,
        amount: r.amount.toString(),
        receiptNumber: r.receiptNumber,
      })),
      closed: closed
        ? {
            at: closed.closing.createdAt.toISOString(),
            by: closed.by,
            expectedCash: closed.closing.expectedCash.toString(),
            countedCash: closed.closing.countedCash.toString(),
            note: closed.closing.note,
          }
        : null,
    };
  }
}
