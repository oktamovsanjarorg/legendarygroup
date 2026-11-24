import {
  type CreateExpenseRequest,
  DEFAULT_BRANCH_ID,
  type ExpenseItem,
  type ListExpensesQuery,
  type MonthlyPnLSummary,
  type UpdateExpenseRequest,
} from '@lg/contracts';
import type { Database, ExpenseRow, Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { buildMonthlyPnLSummary, mapExpenseRow } from './expenses.mappers.js';
import { ExpensesRepository } from './expenses.repository.js';

const expenseAudit = (e: ExpenseRow) => ({
  category: e.category,
  amount: e.amount.toString(),
  date: e.date,
  note: e.note,
  fileId: e.fileId,
});

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(ExpensesRepository) private readonly repo: ExpensesRepository,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createExpense(
    actor: RequestUser,
    req: CreateExpenseRequest,
    ctx: AuditContext,
  ): Promise<ExpenseItem> {
    this.assertNotFuture(req.date);
    const row = await this.db.transaction(async (tx) => {
      const created = await this.repo.createExpense(tx, {
        branchId: DEFAULT_BRANCH_ID,
        category: req.category,
        amount: BigInt(req.amount),
        date: req.date,
        note: req.note ?? null,
        fileId: req.fileId ?? null,
        createdBy: actor.id,
      });
      await this.record(tx, ctx, 'expense.create', { after: created });
      return created;
    });
    return mapExpenseRow(row);
  }

  async getExpense(id: string): Promise<ExpenseItem> {
    const row = await this.repo.findExpenseById(id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'EXPENSE_NOT_FOUND');
    return mapExpenseRow(row);
  }

  async updateExpense(
    id: string,
    { amount, ...rest }: UpdateExpenseRequest,
    ctx: AuditContext,
  ): Promise<ExpenseItem> {
    if (rest.date !== undefined) this.assertNotFuture(rest.date);
    const row = await this.db.transaction(async (tx) => {
      const before = await this.locked(tx, id);
      const after = await this.repo.updateExpense(tx, id, {
        ...rest,
        ...(amount === undefined ? {} : { amount: BigInt(amount) }),
      });
      if (!after) throw new AppException(HttpStatus.NOT_FOUND, 'EXPENSE_NOT_FOUND');
      await this.record(tx, ctx, 'expense.update', { before, after });
      return after;
    });
    return mapExpenseRow(row);
  }

  /** Xarajat — ledger emas: xato yozuv oʻchiriladi, oldingi holati auditda qoladi. */
  async deleteExpense(id: string, ctx: AuditContext): Promise<void> {
    await this.db.transaction(async (tx) => {
      const before = await this.locked(tx, id);
      await this.repo.deleteExpense(tx, id);
      await this.record(tx, ctx, 'expense.delete', { before });
    });
  }

  private async locked(tx: Transaction, id: string): Promise<ExpenseRow> {
    const row = await this.repo.lockExpense(tx, id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'EXPENSE_NOT_FOUND');
    return row;
  }

  private assertNotFuture(date: string): void {
    if (date > this.clock.today())
      throw new AppException(HttpStatus.BAD_REQUEST, 'EXPENSE_DATE_IN_FUTURE');
  }

  private record(
    tx: Transaction,
    ctx: AuditContext,
    action: string,
    v: { before?: ExpenseRow; after?: ExpenseRow },
  ): Promise<void> {
    return this.audit.record(
      ctx,
      {
        action,
        entity: 'expense',
        entityId: (v.after ?? v.before)?.id,
        before: v.before && expenseAudit(v.before),
        after: v.after && expenseAudit(v.after),
      },
      tx,
    );
  }

  async listExpenses(query: ListExpensesQuery): Promise<ExpenseItem[]> {
    const rows = await this.repo.listExpenses(DEFAULT_BRANCH_ID, {
      from: query.from,
      to: query.to,
      category: query.category,
      limit: query.limit,
      offset: query.offset,
    });
    const names = await this.repo.userNames([...new Set(rows.map((r) => r.createdBy))]);
    return rows.map((r) => ({
      ...mapExpenseRow(r),
      createdByName: names.get(r.createdBy) ?? null,
    }));
  }

  async getMonthlyPnL(period: string): Promise<MonthlyPnLSummary> {
    const [payments, expenses, payrollTotal] = await Promise.all([
      this.repo.findPeriodPayments(DEFAULT_BRANCH_ID, period),
      this.repo.findExpensesForPeriod(DEFAULT_BRANCH_ID, period),
      this.repo.findApprovedPayrollTotal(DEFAULT_BRANCH_ID, period),
    ]);

    return buildMonthlyPnLSummary({
      period,
      payments,
      expenses,
      payrollTotal,
    });
  }
}
