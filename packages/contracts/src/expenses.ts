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
/** Musbat butun soʻm; 12 raqam — Mini App maydoni bilan bir xil chegara. */
const PositiveMoney = z.string().regex(/^[1-9]\d{0,11}$/, 'AMOUNT_INVALID');
const IsoDate = z.iso.date();
const PeriodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const ExpenseItemSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.string().regex(MoneyRegex),
  date: IsoDate,
  note: z.string().nullable(),
  fileId: z.string().uuid().nullable(),
  createdBy: z.string().uuid(),
  /** Ro'yxatda — kiritgan xodim ismi (W-23). */
  createdByName: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExpenseItem = z.infer<typeof ExpenseItemSchema>;

export const CreateExpenseRequest = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: PositiveMoney,
  date: IsoDate,
  note: z.string().max(1000).optional(),
  fileId: z.string().uuid().optional(),
});
export type CreateExpenseRequest = z.infer<typeof CreateExpenseRequest>;

export const UpdateExpenseRequest = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  amount: PositiveMoney.optional(),
  date: IsoDate.optional(),
  note: z.string().max(1000).nullable().optional(),
  fileId: z.string().uuid().nullable().optional(),
});
export type UpdateExpenseRequest = z.infer<typeof UpdateExpenseRequest>;

export const ListExpensesQuery = z.object({
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListExpensesQuery = z.infer<typeof ListExpensesQuery>;

export const MonthlyPnLSummarySchema = z.object({
  period: z.string().regex(PeriodRegex),
  /** Qaytarish (refund) tushumdan koʻp boʻlsa — manfiy. */
  revenue: z.string().regex(/^-?\d+$/),
  expenses: z.string().regex(MoneyRegex),
  payroll: z.string().regex(MoneyRegex),
  /** Operatsion xarajat + oylik (W-24 "Jami xarajat"). */
  totalCosts: z.string().regex(MoneyRegex),
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
