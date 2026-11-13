import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'marketing',
  'salary',
  'supplies',
  'maintenance',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const MoneyRegex = /^\d+$/;
const DateRegex = /^\d{4}-\d{2}-\d{2}$/;
const PeriodRegex = /^\d{4}-\d{2}$/;

export const ExpenseItemSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.string().regex(MoneyRegex),
  date: z.string().regex(DateRegex),
  note: z.string().nullable(),
  fileId: z.string().uuid().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExpenseItem = z.infer<typeof ExpenseItemSchema>;

export const CreateExpenseRequest = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.string().regex(MoneyRegex),
  date: z.string().regex(DateRegex),
  note: z.string().max(1000).optional(),
  fileId: z.string().uuid().optional(),
});
export type CreateExpenseRequest = z.infer<typeof CreateExpenseRequest>;

export const UpdateExpenseRequest = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  amount: z.string().regex(MoneyRegex).optional(),
  date: z.string().regex(DateRegex).optional(),
  note: z.string().max(1000).nullable().optional(),
  fileId: z.string().uuid().nullable().optional(),
});
export type UpdateExpenseRequest = z.infer<typeof UpdateExpenseRequest>;

export const ListExpensesQuery = z.object({
  from: z.string().regex(DateRegex).optional(),
  to: z.string().regex(DateRegex).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListExpensesQuery = z.infer<typeof ListExpensesQuery>;

export const MonthlyPnLSummarySchema = z.object({
  period: z.string().regex(PeriodRegex),
  revenue: z.string().regex(MoneyRegex),
  expenses: z.string().regex(MoneyRegex),
  payroll: z.string().regex(MoneyRegex),
  netProfit: z.string(), // musbat yoki manfiy bo'lishi mumkin (-1000000)
  profitMarginBp: z.number().int(), // bazis punktlarda (100% = 10000)
  expensesByCategory: z.record(z.string(), z.string()),
  revenueByMethod: z.record(z.string(), z.string()),
});
export type MonthlyPnLSummary = z.infer<typeof MonthlyPnLSummarySchema>;

export const PnLQuery = z.object({
  period: z.string().regex(PeriodRegex),
});
export type PnLQuery = z.infer<typeof PnLQuery>;
