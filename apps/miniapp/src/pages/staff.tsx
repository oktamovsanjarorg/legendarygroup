import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import type { QuickAction } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import {
  useApproval,
  useApprovals,
  useDecideApproval,
  useReviewDecision,
  useReviewQueue,
  useStaffKpi,
} from '../data/staff.js';
import { ApprovalDecisionView, ApprovalsView } from '../screens/staff/approvals.js';
import type { StaffMenuKey } from '../data/staff-menu.js';
import { type KpiTarget, StaffDashboardView } from '../screens/staff/dashboard.js';
import { STAFF_ICONS } from '../screens/staff/menu-icons.js';
import { ReviewView } from '../screens/staff/review.js';
import { useMe } from '../session/session.js';
import { StudentListScreen } from './student-list-screen.js';

const Alert = ({ error }: { error: unknown }) => (
  <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
    {errorText(error)}
  </p>
);

/** KPI → Mini App ekrani (Q-99: tashqi panel yo'q). */
const KPI_ROUTES: Record<KpiTarget, string> = {
  payments: '/staff/payments',
  attendance: '/staff/attendance',
  unmarked: '/staff/attendance',
  absent: '/staff/attendance',
  queue: '/staff/queue',
  approvals: '/staff/approvals',
};

/** Bosh sahifadagi tezkor amallar: eng ko'p ishlar, ruxsatga qarab (Q-113). */
const QUICK: readonly { key: StaffMenuKey; permission: string; to: string }[] = [
  { key: 'pay', permission: 'payment.create', to: '/staff/pay' },
  { key: 'newStudent', permission: 'student.manage', to: '/staff/new' },
  { key: 'queue', permission: 'payment.review', to: '/staff/queue' },
  { key: 'approvals', permission: 'approval.decide', to: '/staff/approvals' },
  { key: 'attendance', permission: 'attendance.edit_past', to: '/staff/attendance' },
  { key: 'debtors', permission: 'payment.review', to: '/staff/debtors' },
];

/** MS-01 xodim bosh sahifasi (T-120): KPI va tezkor amallar; MainButton yo'q (Q-113). */
export function StaffDashboardPage() {
  const me = useMe();
  const navigate = useNavigate();
  const query = useStaffKpi(me.activeRole === 'director');
  const badges: Partial<Record<StaffMenuKey, number>> = {
    queue: query.data?.queue,
    approvals: query.data?.approvals,
  };
  const actions: QuickAction[] = QUICK.filter((q) => me.permissions.includes(q.permission)).map(
    (q) => ({
      key: q.key,
      label: t.staffMore.items[q.key],
      icon: STAFF_ICONS[q.key],
      badge: badges[q.key] || undefined,
      onClick: () => void navigate({ to: q.to }),
    }),
  );
  return (
    <QueryView query={query}>
      {(k) => (
        <StaffDashboardView
          k={k}
          actions={actions}
          onOpen={(target) => void navigate({ to: KPI_ROUTES[target] })}
        />
      )}
    </QueryView>
  );
}

/** MS-02 chek navbati (FR-PAY-4, BR-13/14/15). */
export function StaffQueuePage() {
  const me = useMe();
  const [index, setIndex] = useState(0);
  const query = useReviewQueue(index, me.id);
  const decide = useReviewDecision();
  // Boshqa Admin ochib turgan chek — keyingisiga o'tiladi.
  const skip = () => setIndex((i) => i + 1);
  return (
    <QueryView query={query}>
      {(d) => (
        <>
          {decide.isError && <Alert error={decide.error} />}
          <ReviewView
            item={d.item}
            position={d.position}
            total={d.total}
            busy={decide.isPending}
            onApprove={(id, amount) =>
              decide.mutate({ id, kind: 'confirm', amount }, { onError: skip })
            }
            onReject={(id, reason) =>
              decide.mutate({ id, kind: 'reject', reason }, { onError: skip })
            }
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffApprovalsPage() {
  const navigate = useNavigate();
  const query = useApprovals();
  return (
    <QueryView query={query}>
      {(items) => (
        <ApprovalsView
          items={items}
          onOpen={(r) => void navigate({ to: '/staff/approvals/$id', params: { id: r.id } })}
        />
      )}
    </QueryView>
  );
}

/** Qaror — faqat Director (approval.decide); Admin'ga server 403 beradi. */
export function StaffApprovalPage() {
  const { id } = useParams({ from: '/staff/approvals/$id' });
  const navigate = useNavigate();
  const query = useApproval(id);
  const decide = useDecideApproval(id);
  const back = () => void navigate({ to: '/staff/approvals' });
  return (
    <QueryView query={query}>
      {(r) => (
        <>
          {decide.isError && <Alert error={decide.error} />}
          <ApprovalDecisionView
            r={r}
            busy={decide.isPending}
            onApprove={() => decide.mutate({ decision: 'approve' }, { onSuccess: back })}
            onReject={(note) => decide.mutate({ decision: 'reject', note }, { onSuccess: back })}
          />
        </>
      )}
    </QueryView>
  );
}

/** MS-04 qidiruv (kamida 2 belgi; oʻ/o' bir xil — server normalizatsiyasi). */
export function StaffSearchPage() {
  const navigate = useNavigate();
  return (
    <StudentListScreen
      onOpen={(s) => void navigate({ to: '/staff/student/$id', params: { id: s.id } })}
    />
  );
}
