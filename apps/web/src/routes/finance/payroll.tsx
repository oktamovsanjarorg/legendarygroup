import type { PayrollRunDetail } from '@lg/contracts';
import { formatPeriod } from '@lg/i18n';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import type { PayrollLineKind, PayrollRow } from '../../screens/f3/types.js';
import { PayrollView } from '../../screens/f3/w25-payroll.js';

export const toPayrollRows = (r: PayrollRunDetail): PayrollRow[] =>
  r.teachers.map((x) => ({
    id: x.teacherId,
    staffName: x.teacherName,
    earned: BigInt(x.earned),
    extras: BigInt(x.extras),
    advances: BigInt(x.advances),
    total: BigInt(x.totalNet),
    lines: x.items.map((i) => ({
      kind: i.kind as PayrollLineKind,
      amount: BigInt(i.amount),
      note: i.note,
    })),
  }));

type Act = 'generate' | 'approve' | 'pay';

function PayrollScreen({ canApprove }: { canApprove: boolean }) {
  const qc = useQueryClient();
  const period = todayYmd().slice(0, 7);
  const q = useQuery({
    queryKey: ['payroll', 'run', period],
    queryFn: () => api.request<PayrollRunDetail | null>(`/payroll/runs?period=${period}`),
  });
  const act = useMutation({
    mutationFn: (a: Act) =>
      a === 'generate'
        ? api.request('/payroll/runs/generate', { method: 'POST', body: { period } })
        : api.request(`/payroll/runs/${q.data?.id ?? ''}/${a}`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['payroll'] }),
  });
  if (q.isPending) return <LoadingState rows={5} />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  const run = q.data;
  return (
    <PayrollView
      periodLabel={formatPeriod(period)}
      status={run?.status ?? null}
      rows={run ? toPayrollRows(run) : []}
      total={BigInt(run?.totalAmount ?? '0')}
      onGenerate={() => act.mutate('generate')}
      onApprove={canApprove ? () => act.mutate('approve') : undefined}
      onPay={() => act.mutate('pay')}
      busy={act.isPending}
      error={act.isError ? errorText(act.error) : undefined}
    />
  );
}

/** W-25 Oyliklar (T-402, FR-SAL-1/2/3/5, BR-27): `payroll.manage`; tasdiq — `approval.decide`. */
export function PayrollPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('payroll.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <PayrollScreen canApprove={permissions.has('approval.decide')} />;
}
