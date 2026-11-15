import type { MonthlyPnLSummary } from '@lg/contracts';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../api/client.js';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import type { PnlMonthRow } from '../../screens/f3/types.js';
import { PnlView } from '../../screens/f3/w24-pnl.js';
import { prevPeriod } from './period.js';

/** So'nggi N oy (eng eskisi birinchi). */
export const lastPeriods = (current: string, n: number): string[] => {
  const out = [current];
  while (out.length < n) out.unshift(prevPeriod(out[0] ?? current));
  return out;
};

export const toPnlRow = (p: MonthlyPnLSummary): PnlMonthRow => ({
  month: p.period,
  revenue: BigInt(p.revenue),
  payroll: BigInt(p.payroll),
  operational: BigInt(p.expenses),
  totalExpenses: BigInt(p.totalCosts),
  netProfit: BigInt(p.netProfit),
  // Bazis punkt → foiz (faqat ko'rsatish; hisob serverda).
  marginPercent: p.profitMarginBp / 100,
});

function PnlScreen() {
  const periods = lastPeriods(todayYmd().slice(0, 7), 6);
  const qs = useQueries({
    queries: periods.map((p) => ({
      queryKey: ['finance', 'pnl', p],
      queryFn: () => api.request<MonthlyPnLSummary>(`/finance/pnl?period=${p}`),
    })),
  });
  const failed = qs.find((q) => q.isError);
  if (failed) return <ErrorState {...errorView(failed.error, () => void failed.refetch())} />;
  if (qs.some((q) => q.isPending)) return <LoadingState rows={6} />;
  return <PnlView months={qs.flatMap((q) => (q.data ? [toPnlRow(q.data)] : []))} />;
}

/** W-24 P&L (T-403, FR-FIN-2/3): faqat `finance.view`. */
export function PnlPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('finance.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <PnlScreen />;
}
