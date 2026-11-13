import type { ExpenseItem, MonthlyPnLSummary } from '@lg/contracts';
import type { ExpenseRow } from '@lg/db';
import {
  aggregateExpensesByCategory,
  aggregateRevenueByMethod,
  calculateNetProfit,
  calculateProfitMarginBp,
} from '@lg/domain';

export function mapExpenseRow(row: ExpenseRow): ExpenseItem {
  return {
    id: row.id,
    branchId: row.branchId,
    category: row.category as ExpenseItem['category'],
    amount: row.amount.toString(),
    date: row.date,
    note: row.note,
    fileId: row.fileId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function buildMonthlyPnLSummary(params: {
  period: string;
  payments: { method: string; amount: bigint }[];
  expenses: ExpenseRow[];
  payrollTotal: bigint;
}): MonthlyPnLSummary {
  const revByMethod = aggregateRevenueByMethod(params.payments);
  let totalRevenue = 0n;
  const revenueByMethodStr: Record<string, string> = {};
  for (const [method, amount] of Object.entries(revByMethod)) {
    totalRevenue += amount;
    revenueByMethodStr[method] = amount.toString();
  }

  const expByCategory = aggregateExpensesByCategory(
    params.expenses.map((e) => ({ category: e.category, amount: e.amount })),
  );
  let totalExpenses = 0n;
  const expensesByCategoryStr: Record<string, string> = {};
  for (const [cat, amount] of Object.entries(expByCategory)) {
    totalExpenses += amount;
    expensesByCategoryStr[cat] = amount.toString();
  }

  const netProfit = calculateNetProfit(totalRevenue, totalExpenses, params.payrollTotal);
  const marginBp = calculateProfitMarginBp(totalRevenue, netProfit);

  return {
    period: params.period,
    revenue: totalRevenue.toString(),
    expenses: totalExpenses.toString(),
    payroll: params.payrollTotal.toString(),
    netProfit: netProfit.toString(),
    profitMarginBp: marginBp,
    expensesByCategory: expensesByCategoryStr,
    revenueByMethod: revenueByMethodStr,
  };
}
