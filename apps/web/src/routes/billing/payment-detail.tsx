import type { PaymentMethod, PaymentView } from '@lg/contracts';
import { formatPeriod } from '@lg/i18n';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { type PayMethod } from '../../screens/f2/pay-entry.js';
import { type PaymentDetail, PaymentDetailView } from '../../screens/f2/payment-detail.js';
import { PaymentActionDrawer } from './payment-action-drawer.js';
import { usePaymentView } from './use-payment.js';

/** API usuli → ekran usuli (03 §2). */
export const SCREEN_METHOD: Record<PaymentMethod, PayMethod> = {
  cash: 'cash',
  card: 'card_terminal',
  bank: 'transfer',
  other: 'other',
};

export const toDetail = (v: PaymentView): PaymentDetail => ({
  receiptNo: v.receiptNumber ?? '—',
  at: new Date(v.paidAt),
  student: v.studentName,
  amount: BigInt(v.amount),
  method: SCREEN_METHOD[v.method],
  createdBy: v.createdBy ?? '—',
  reviewedBy: v.viaSubmission ? (v.createdBy ?? undefined) : undefined,
  verifyUrl: v.verifyUrl ?? '—',
  ledger: v.allocations.map((a) => ({ what: formatPeriod(a.period), amount: BigInt(a.amount) })),
  reversed: v.reversed ? { reason: v.reversed.reason } : undefined,
  enteredToday: v.canReverseNow,
});

type Drawer = 'reverse' | 'refund' | null;

function PaymentScreen({ id }: { id: string }) {
  const { permissions } = useAuth();
  const q = usePaymentView(id);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  const v = q.data;
  const canRequest = permissions.has('payment.review');
  const direct = drawer === 'refund' ? permissions.has('payment.refund') : v.canReverseNow;
  return (
    <>
      {notice && (
        <p role="status" className="mb-4 rounded-md bg-success-bg p-3 text-sm text-success">
          {notice}
        </p>
      )}
      <PaymentDetailView
        p={toDetail(v)}
        isDirector={permissions.has('payment.refund') || canRequest}
        onReverse={() => setDrawer('reverse')}
        onRefund={() => setDrawer('refund')}
      />
      {drawer && (
        <PaymentActionDrawer
          kind={drawer}
          p={v}
          direct={direct}
          onClose={() => setDrawer(null)}
          onDone={(m) => {
            setDrawer(null);
            setNotice(m);
          }}
        />
      )}
    </>
  );
}

/** W-17 To'lov tafsiloti (T-205/T-209, FR-PAY-6/8/9): `billing.view`. */
export function PaymentDetailPage({ id }: { id: string }) {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('billing.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <PaymentScreen id={id} />;
}
