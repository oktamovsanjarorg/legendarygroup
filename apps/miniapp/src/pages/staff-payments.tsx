import type { PaymentMethod } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { useReceiptPdf } from '../data/guardian.js';
import { QueryView } from '../data/query-view.js';
import { useStaffCall } from '../data/staff-call.js';
import { shiftPeriod } from '../data/staff-finance.js';
import {
  discountCall,
  refundCall,
  reverseCall,
  useDiscounts,
  useInvoice,
  usePaymentHistory,
  usePaymentView,
  useStudentFinance,
} from '../data/staff-payments.js';
import { useStudentCard } from '../data/staff.js';
import { DiscountFormView, DiscountsView } from '../screens/staff/discounts.js';
import { ReasonView } from '../screens/staff/lead-forms.js';
import { PaymentDetailView, PaymentsView, ReverseView } from '../screens/staff/payments.js';
import { InvoiceView, RefundView, StudentFinanceView } from '../screens/staff/student-finance.js';
import { useMe } from '../session/session.js';
import { ErrorNotice, OkNotice } from './notice.js';

const f = t.staffFinance;

/** MS-24 Toʻlovlar tarixi (T-153). */
export function StaffPaymentsPage() {
  const navigate = useNavigate();
  const current = useClock().today().slice(0, 7);
  const [period, setPeriod] = useState(current);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const query = usePaymentHistory(period, method);
  return (
    <QueryView query={query}>
      {(d) => (
        <PaymentsView
          period={period}
          current={current}
          method={method}
          total={d.total}
          items={d.items}
          hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          onStep={(s) => setPeriod((x) => shiftPeriod(x, s))}
          onMethod={setMethod}
          onOpen={(id) => void navigate({ to: '/staff/payments/$id', params: { id } })}
          onMore={() => void query.fetchNextPage()}
        />
      )}
    </QueryView>
  );
}

/** MS-24a Toʻlov tafsiloti. */
export function StaffPaymentPage() {
  const { id } = useParams({ from: '/staff/payments/$id' });
  const navigate = useNavigate();
  const { permissions } = useMe();
  const pdf = useReceiptPdf();
  // Bugungi emas — Adminda soʻrov yoʻli (02 §5); soʻrov `payment.create` bilan yuboriladi.
  const canAsk = permissions.includes('payment.reverse') && permissions.includes('payment.create');
  return (
    <QueryView query={usePaymentView(id)}>
      {(v) => (
        <>
          <ErrorNotice error={pdf.error} />
          <PaymentDetailView
            v={v}
            onStudent={() =>
              void navigate({ to: '/staff/student/$id', params: { id: v.studentId } })
            }
            onReceipt={() => v.receiptNumber && pdf.mutate(v.receiptNumber)}
            onReverse={
              v.kind === 'payment' && !v.reversed && (v.canReverseNow || canAsk)
                ? () => void navigate({ to: '/staff/payments/$id/reverse', params: { id } })
                : undefined
            }
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffReversePage() {
  const { id } = useParams({ from: '/staff/payments/$id/reverse' });
  const navigate = useNavigate();
  const call = useStaffCall();
  const [sent, setSent] = useState(false);
  const back = () => void navigate({ to: '/staff/payments/$id', params: { id }, replace: true });
  return (
    <QueryView query={usePaymentView(id)}>
      {(v) =>
        sent ? (
          <OkNotice text={t.staffPayments.requestSent} />
        ) : (
          <>
            <ErrorNotice error={call.error} />
            <ReverseView
              v={v}
              saving={call.isPending}
              onSave={(reason) =>
                call.mutate(reverseCall(id, reason, v.canReverseNow), {
                  onSuccess: () => (v.canReverseNow ? back() : setSent(true)),
                })
              }
            />
          </>
        )
      }
    </QueryView>
  );
}

/** Oʻquvchi hisobi (T-153). */
export function StaffStudentFinancePage() {
  const { id } = useParams({ from: '/staff/student/$id/finance' });
  const navigate = useNavigate();
  const { permissions } = useMe();
  const card = useStudentCard(id);
  const canRefund =
    permissions.includes('payment.refund') || permissions.includes('payment.create');
  return (
    <QueryView query={useStudentFinance(id)}>
      {(d) => (
        <StudentFinanceView
          student={card.data?.student.fullName ?? ''}
          f={d}
          onInvoice={(invoiceId) =>
            void navigate({
              to: '/staff/student/$id/invoice/$invoiceId',
              params: { id, invoiceId },
            })
          }
          onPayment={(p) => void navigate({ to: '/staff/payments/$id', params: { id: p } })}
          onRefund={
            canRefund
              ? () => void navigate({ to: '/staff/student/$id/refund', params: { id } })
              : undefined
          }
        />
      )}
    </QueryView>
  );
}

export function StaffInvoicePage() {
  const { id, invoiceId } = useParams({ from: '/staff/student/$id/invoice/$invoiceId' });
  const navigate = useNavigate();
  const canWaive = useMe().permissions.includes('penalty.waive');
  return (
    <QueryView query={useInvoice(invoiceId)}>
      {(invoice) => (
        <InvoiceView
          invoice={invoice}
          onWaive={
            canWaive
              ? (lineId) =>
                  void navigate({
                    to: '/staff/student/$id/invoice/$invoiceId/waive/$lineId',
                    params: { id, invoiceId, lineId },
                  })
              : undefined
          }
        />
      )}
    </QueryView>
  );
}

export function StaffWaivePage() {
  const params = useParams({ from: '/staff/student/$id/invoice/$invoiceId/waive/$lineId' });
  const navigate = useNavigate();
  const call = useStaffCall();
  const path = `/billing/invoices/${params.invoiceId}/lines/${params.lineId}/waive`;
  const back = () =>
    void navigate({ to: '/staff/student/$id/invoice/$invoiceId', params, replace: true });
  return (
    <>
      <ErrorNotice error={call.error} />
      <ReasonView
        title={f.waive}
        label={t.staffPayments.reason}
        action={f.waive}
        hint={f.waiveHint}
        saving={call.isPending}
        onSave={(reason) => call.mutate({ path, body: { reason } }, { onSuccess: back })}
      />
    </>
  );
}

export function StaffRefundPage() {
  const { id } = useParams({ from: '/staff/student/$id/refund' });
  const navigate = useNavigate();
  const direct = useMe().permissions.includes('payment.refund');
  const card = useStudentCard(id);
  const call = useStaffCall();
  const [key] = useState(() => crypto.randomUUID());
  const back = () =>
    void navigate({ to: '/staff/student/$id/finance', params: { id }, replace: true });
  if (call.isSuccess && !direct) return <OkNotice text={f.requestSent} />;
  return (
    <QueryView query={useStudentFinance(id)}>
      {(d) => (
        <>
          <ErrorNotice error={call.error} />
          <RefundView
            student={card.data?.student.fullName ?? ''}
            advance={BigInt(d.summary.totalAdvance)}
            direct={direct}
            saving={call.isPending}
            onSave={({ amount, method, reason }) =>
              call.mutate(
                refundCall({ studentId: id, amount: String(amount), method, reason }, direct, key),
                { onSuccess: () => (direct ? back() : undefined) },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}

/** MS-17 Chegirmalar (T-141). */
export function StaffDiscountsPage() {
  const navigate = useNavigate();
  return (
    <QueryView query={useDiscounts()}>
      {(d) => (
        <DiscountsView
          items={d.items}
          onOpen={(x) =>
            void navigate({
              to: '/staff/student/$id/discount/$enrollmentId',
              params: { id: x.studentId, enrollmentId: x.enrollmentId },
            })
          }
        />
      )}
    </QueryView>
  );
}

export function StaffDiscountPage() {
  const { id, enrollmentId } = useParams({ from: '/staff/student/$id/discount/$enrollmentId' });
  const navigate = useNavigate();
  const me = useMe();
  const card = useStudentCard(id);
  const call = useStaffCall();
  const [sent, setSent] = useState(false);
  const back = () =>
    void navigate({
      to: '/staff/student/$id/enrollment/$enrollmentId',
      params: { id, enrollmentId },
      replace: true,
    });
  const e = card.data?.enrollments.find((x) => x.id === enrollmentId);
  if (sent) return <OkNotice text={t.staffDiscounts.requestSent} />;
  return (
    <QueryView query={useDiscounts()}>
      {(d) =>
        e ? (
          <>
            <ErrorNotice error={call.error} />
            <DiscountFormView
              student={card.data?.student.fullName ?? ''}
              group={e.group.name}
              initial={e.discountPercent ?? 0}
              limit={me.activeRole === 'director' ? null : d.adminLimitPercent}
              saving={call.isPending}
              onSave={({ direct, ...v }) =>
                call.mutate(discountCall({ enrollmentId, ...v }, direct), {
                  onSuccess: () => (direct ? back() : setSent(true)),
                })
              }
            />
          </>
        ) : (
          <ErrorNotice error={card.error} />
        )
      }
    </QueryView>
  );
}
