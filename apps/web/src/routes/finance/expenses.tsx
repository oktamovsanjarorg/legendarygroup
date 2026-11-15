import type { ExpenseCategory, ExpenseItem as ApiExpense, MonthlyPnLSummary } from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import { uploadFile } from '../../lib/upload.js';
import type { ExpenseItem } from '../../screens/f3/types.js';
import { type ExpensesKpi, ExpensesView, type NewExpense } from '../../screens/f3/w23-expenses.js';
import { monthBounds, prevPeriod } from './period.js';

export const toExpenseRow = (e: ApiExpense): ExpenseItem => ({
  id: e.id,
  date: new Date(`${e.date}T00:00:00+05:00`),
  category: e.category,
  description: e.note ?? '—',
  amount: BigInt(e.amount),
  hasReceipt: e.fileId !== null,
  author: e.createdByName ?? '—',
});

/** KPI — P&L summalaridan (server); eng katta modda — bigint taqqoslash, farq — ayirma. */
export function toKpi(cur?: MonthlyPnLSummary, prev?: MonthlyPnLSummary): ExpensesKpi {
  const by = Object.entries(cur?.expensesByCategory ?? {}).map(([k, v]) => [k, BigInt(v)] as const);
  const top = by.reduce<readonly [string, bigint] | null>(
    (m, x) => (!m || x[1] > m[1] ? x : m),
    null,
  );
  return {
    total: BigInt(cur?.expenses ?? '0'),
    topCategory: top && top[1] > 0n ? (top[0] as ExpenseCategory) : null,
    delta: cur && prev ? BigInt(cur.expenses) - BigInt(prev.expenses) : null,
  };
}

const usePnl = (period: string, enabled: boolean) =>
  useQuery({
    queryKey: ['finance', 'pnl', period],
    queryFn: () => api.request<MonthlyPnLSummary>(`/finance/pnl?period=${period}`),
    enabled,
  });

function ExpensesScreen({ canSeePnl }: { canSeePnl: boolean }) {
  const qc = useQueryClient();
  const today = todayYmd();
  const period = today.slice(0, 7);
  const { from, to } = monthBounds(period);
  const list = useQuery({
    queryKey: ['finance', 'expenses', period],
    queryFn: () => api.request<ApiExpense[]>(`/expenses?from=${from}&to=${to}&limit=100`),
  });
  const cur = usePnl(period, canSeePnl);
  const prev = usePnl(prevPeriod(period), canSeePnl);
  const [savedKey, setSavedKey] = useState(0);
  const add = useMutation({
    mutationFn: async (x: NewExpense) => {
      const file = x.file ? await uploadFile('expense_receipt', x.file) : null;
      return api.request('/expenses', {
        method: 'POST',
        body: {
          category: x.category,
          amount: x.amount.toString(),
          date: x.date,
          ...(x.note ? { note: x.note } : {}),
          ...(file ? { fileId: file.id } : {}),
        },
      });
    },
    onSuccess: () => {
      setSavedKey((k) => k + 1);
      void qc.invalidateQueries({ queryKey: ['finance'] });
    },
  });
  return (
    <ExpensesView
      expenses={(list.data ?? []).map(toExpenseRow)}
      kpi={toKpi(cur.data, prev.data)}
      today={today}
      onAdd={(x) => add.mutate(x)}
      saving={add.isPending}
      error={add.isError ? errorText(add.error) : undefined}
      savedKey={savedKey}
      loading={list.isPending}
      loadError={list.isError ? errorView(list.error, () => void list.refetch()) : undefined}
    />
  );
}

/** W-23 Xarajatlar (T-403, FR-FIN-1/3): `expense.manage`; KPI — `finance.view` bo'lsa. */
export function ExpensesPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('expense.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <ExpensesScreen canSeePnl={permissions.has('finance.view')} />;
}
