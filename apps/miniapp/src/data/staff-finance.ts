import type {
  CreateExpenseRequest,
  ExpenseCategory,
  ExpenseItem,
  MonthlyPnLSummary,
} from '@lg/contracts';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'finance'] as const;
const PAGE = 50;

export interface ExpenseForm {
  category: ExpenseCategory;
  amount: bigint | null;
  date: string;
  note: string;
}

export const emptyExpense = (today: string): ExpenseForm => ({
  category: 'other',
  amount: null,
  date: today,
  note: '',
});

export const expenseForm = (e: ExpenseItem): ExpenseForm => ({
  category: e.category,
  amount: BigInt(e.amount),
  date: e.date,
  note: e.note ?? '',
});

export const expenseReady = (f: ExpenseForm, today: string): boolean =>
  f.amount !== null && f.date !== '' && f.date <= today;

/** `null` — summa kiritilmagan. */
export function expenseRequest(f: ExpenseForm, fileId: string | null): CreateExpenseRequest | null {
  if (f.amount === null) return null;
  return {
    category: f.category,
    amount: f.amount.toString(),
    date: f.date,
    note: f.note.trim() || undefined,
    fileId: fileId ?? undefined,
  };
}

/** `2026-11` + n oy. */
export function shiftPeriod(period: string, n: number): string {
  const [y = 0, m = 1] = period.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** Oyning birinchi va oxirgi kuni (`YYYY-MM-DD`). */
export function periodRange(period: string): { from: string; to: string } {
  const [y = 0, m = 1] = period.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(days).padStart(2, '0')}` };
}

export function usePnl(period: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'pnl', period],
    queryFn: () => api.request<MonthlyPnLSummary>(`/finance/pnl?period=${period}`),
    placeholderData: keepPreviousData,
  });
}

/** Ruxsat `expense.manage` bo'lmasa — so'ralmaydi (P&L o'zi ko'rinadi). */
export function useExpenses(period: string, enabled: boolean) {
  const api = useApi();
  const { from, to } = periodRange(period);
  return useInfiniteQuery({
    queryKey: [...KEY, 'expenses', period],
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<ExpenseItem[]>(
        `/expenses?from=${from}&to=${to}&limit=${PAGE}&offset=${pageParam}`,
      ),
    getNextPageParam: (last, pages) =>
      last.length < PAGE ? undefined : pages.reduce((n, p) => n + p.length, 0),
    select: (d) => d.pages.flat(),
  });
}

export function useExpense(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'expense', id],
    queryFn: () => api.request<ExpenseItem>(`/expenses/${id}`),
  });
}

/** `id` yo'q — yangi xarajat. */
export function useSaveExpense(id?: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExpenseRequest) =>
      id
        ? api.request(`/expenses/${id}`, {
            method: 'PATCH',
            body: { ...body, note: body.note ?? null },
          })
        : api.request('/expenses', { method: 'POST', body }),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteExpense(id: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.request(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
