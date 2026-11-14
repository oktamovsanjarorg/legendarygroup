import type {
  CreateExpenseRequest,
  ExpenseItem,
  ListExpensesQuery,
  MonthlyPnLSummary,
  UpdateExpenseRequest,
} from '@lg/contracts';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../auth/index.js';
import { buildMonthlyPnLSummary, mapExpenseRow } from './expenses.mappers.js';
import { ExpensesRepository } from './expenses.repository.js';

@Injectable()
export class ExpensesService {
  constructor(@Inject(ExpensesRepository) private readonly repo: ExpensesRepository) {}

  async createExpense(
    actor: RequestUser,
    branchId: string,
    req: CreateExpenseRequest,
  ): Promise<ExpenseItem> {
    const row = await this.repo.createExpense({
      branchId,
      category: req.category,
      amount: BigInt(req.amount),
      date: req.date,
      note: req.note ?? null,
      fileId: req.fileId ?? null,
      createdBy: actor.id,
    });
    return mapExpenseRow(row);
  }

  async getExpense(_actor: RequestUser, id: string): Promise<ExpenseItem> {
    const row = await this.repo.findExpenseById(id);
    if (!row) throw new NotFoundException({ code: 'EXPENSE_NOT_FOUND' });
    return mapExpenseRow(row);
  }

  async updateExpense(
    _actor: RequestUser,
    id: string,
    req: UpdateExpenseRequest,
  ): Promise<ExpenseItem> {
    const existing = await this.repo.findExpenseById(id);
    if (!existing) throw new NotFoundException({ code: 'EXPENSE_NOT_FOUND' });

    const updateData: Parameters<ExpensesRepository['updateExpense']>[1] = {};
    if (req.category !== undefined) updateData.category = req.category;
    if (req.amount !== undefined) updateData.amount = BigInt(req.amount);
    if (req.date !== undefined) updateData.date = req.date;
    if (req.note !== undefined) updateData.note = req.note;
    if (req.fileId !== undefined) updateData.fileId = req.fileId;

    const updated = await this.repo.updateExpense(id, updateData);
    if (!updated) throw new NotFoundException({ code: 'EXPENSE_NOT_FOUND' });
    return mapExpenseRow(updated);
  }

  async deleteExpense(_actor: RequestUser, id: string): Promise<void> {
    const existing = await this.repo.findExpenseById(id);
    if (!existing) throw new NotFoundException({ code: 'EXPENSE_NOT_FOUND' });
    await this.repo.deleteExpense(id);
  }

  async listExpenses(
    _actor: RequestUser,
    branchId: string,
    query: ListExpensesQuery,
  ): Promise<ExpenseItem[]> {
    const rows = await this.repo.listExpenses(branchId, {
      from: query.from,
      to: query.to,
      category: query.category,
      limit: query.limit,
      offset: query.offset,
    });
    return rows.map(mapExpenseRow);
  }

  async getMonthlyPnL(
    _actor: RequestUser,
    branchId: string,
    period: string,
  ): Promise<MonthlyPnLSummary> {
    const [payments, expenses, payrollTotal] = await Promise.all([
      this.repo.findPeriodPayments(branchId, period),
      this.repo.findExpensesForPeriod(branchId, period),
      this.repo.findApprovedPayrollTotal(branchId, period),
    ]);

    return buildMonthlyPnLSummary({
      period,
      payments,
      expenses,
      payrollTotal,
    });
  }
}
