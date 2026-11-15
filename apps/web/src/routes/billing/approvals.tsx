import type { ApprovalRequest } from '@lg/contracts';
import { formatMoney, miniappMessages as m } from '@lg/i18n';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { type WebApproval, WebApprovalsView } from '../../screens/f2/approvals.js';

const a = m.approvals;
const str = (v: unknown): string =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : '';

/** Payload (T-119 shakllari) → o'qiladigan qatorlar; UI pul hisoblamaydi — faqat formatlaydi. */
export function approvalDetails(p: Record<string, unknown>): WebApproval['details'] {
  const rows: { label: string; value: string }[] = [];
  if (p['percent'] !== undefined)
    rows.push({ label: a.fields.percent, value: `${str(p['percent'])}%` });
  if (/^\d+$/.test(str(p['amount'])))
    rows.push({ label: a.fields.amount, value: formatMoney(BigInt(str(p['amount']))) });
  const status = str(p['status']);
  if (status in a.attendance)
    rows.push({ label: a.fields.status, value: a.attendance[status as keyof typeof a.attendance] });
  return rows;
}

export const toWebApproval = (r: ApprovalRequest): WebApproval => ({
  id: r.id,
  type: r.type,
  requestedBy: r.requestedByName ?? '—',
  reason: r.reason,
  details: approvalDetails(r.payload),
  expiresAt: new Date(r.expiresAt),
});

function ApprovalsScreen() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.request<ApprovalRequest[]>('/approvals?status=pending'),
  });
  const [open, setOpen] = useState<WebApproval | null>(null);
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      api.request(`/approvals/${id}/decide`, { method: 'POST', body: { decision } }),
    onSuccess: () => {
      setOpen(null);
      void qc.invalidateQueries({ queryKey: ['approvals'] });
      void qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
  if (q.isPending) return <LoadingState rows={4} />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  const act = (decision: 'approve' | 'reject') => open && decide.mutate({ id: open.id, decision });
  return (
    <>
      {decide.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errorText(decide.error)}
        </p>
      )}
      <WebApprovalsView
        rows={q.data.map(toWebApproval)}
        open={open}
        onOpen={setOpen}
        onClose={() => setOpen(null)}
        onApprove={() => act('approve')}
        onReject={() => act('reject')}
      />
    </>
  );
}

/** W-31 Tasdiqlash so'rovlari (T-119, 02 §5): qaror — faqat `approval.decide` (Director). */
export function ApprovalsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('approval.decide'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <ApprovalsScreen />;
}
