import {
  type Database,
  expenses,
  type ExpenseRow,
  type NewExpenseRow,
  payments,
  payrollRuns,
} from '@lg/db';
import { tashkentMonthRange, type Clock } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lt, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

export interface ListExpensesFilter {
  from?: string;
  to?: string;
  category?: string;
  limit: number;
  offset: number;
}

@Injectable()
export class ExpensesRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async createExpense(data: NewExpenseRow): Promise<ExpenseRow> {
    const [row] = await this.db.insert(expenses).values(data).returning();
    if (!row) throw new Error('EXPENSE_CREATE_FAILED');
    return row;
  }

  async findExpenseById(id: string): Promise<ExpenseRow | null> {
    const [row] = await this.db.select().from(expenses).where(eq(expenses.id, id));
    return row ?? null;
  }

  async updateExpense(id: string, data: Partial<NewExpenseRow>): Promise<ExpenseRow | null> {
    const [row] = await this.db
      .update(expenses)
      .set({ ...data, updatedAt: this.clock.now() })
      .where(eq(expenses.id, id))
      .returning();
    return row ?? null;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await this.db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });
    return result.length > 0;
  }

  async listExpenses(branchId: string, filter: ListExpensesFilter): Promise<ExpenseRow[]> {
    const conditions = [eq(expenses.branchId, branchId)];
    if (filter.from) conditions.push(gte(expenses.date, filter.from));
    if (filter.to) conditions.push(lte(expenses.date, filter.to));
    if (filter.category) conditions.push(eq(expenses.category, filter.category as never));

    return this.db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(filter.limit)
      .offset(filter.offset);
  }

  async findExpensesForPeriod(branchId: string, period: string): Promise<ExpenseRow[]> {
    const [yearStr, monthStr] = period.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const start = `${period}-01`;
    const nextStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.branchId, branchId),
          gte(expenses.date, start),
          lt(expenses.date, nextStart),
        ),
      );
  }

  async findPeriodPayments(
    branchId: string,
    period: string,
  ): Promise<{ method: string; amount: bigint }[]> {
    const { start, end } = tashkentMonthRange(period);

    const rows = await this.db
      .select({
        method: payments.method,
        total: sql<bigint>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(
        and(eq(payments.branchId, branchId), gte(payments.paidAt, start), lt(payments.paidAt, end)),
      )
      .groupBy(payments.method);

    return rows.map((r) => ({ method: r.method, amount: BigInt(r.total) }));
  }

  async findApprovedPayrollTotal(branchId: string, period: string): Promise<bigint> {
    const [row] = await this.db
      .select({
        total: sql<bigint>`coalesce(sum(${payrollRuns.totalAmount}), 0)`,
      })
      .from(payrollRuns)
      .where(
        and(
          eq(payrollRuns.branchId, branchId),
          eq(payrollRuns.period, period),
          sql`${payrollRuns.status} IN ('approved', 'paid')`,
        ),
      );

    return BigInt(row?.total ?? 0n);
  }
}
