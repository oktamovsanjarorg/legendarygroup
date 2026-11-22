import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useMainButton, useWebApp } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import {
  useApproval,
  useApprovals,
  useDecideApproval,
  usePanelHandoff,
  useReviewDecision,
  useReviewQueue,
  useStaffKpi,
  useStudentCard,
  useStudentSearch,
} from '../data/staff.js';
import { ApprovalDecisionView, ApprovalsView } from '../screens/staff/approvals.js';
import { type KpiTarget, StaffDashboardView } from '../screens/staff/dashboard.js';
import { ReviewView } from '../screens/staff/review.js';
import { SearchView } from '../screens/staff/search.js';
import { StudentCardView } from '../screens/staff/student-card.js';
import { useMe } from '../session/session.js';

const Alert = ({ error }: { error: unknown }) => (
  <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
    {errorText(error)}
  </p>
);

/** KPI → Mini App ekrani; qolganlari (to'lovlar, davomat) — web panelda batafsil. */
const KPI_ROUTES: Partial<Record<KpiTarget, '/staff/queue' | '/staff/approvals'>> = {
  queue: '/staff/queue',
  approvals: '/staff/approvals',
};

/**
 * MS-01 asosiy tugmasi (T-121): web panel tizim brauzerida, parol/2FA'siz — kalit bir martalik.
 * Xodim rejimi faqat Director/Admin'da ochiladi, ya'ni web paneli bor rollarda.
 */
export function useOpenPanel() {
  const wa = useWebApp();
  const handoff = usePanelHandoff();
  useMainButton({
    text: t.dashboard.openPanel,
    loading: handoff.isPending,
    onClick: () => handoff.mutate(undefined, { onSuccess: (r) => wa.openLink(r.url) }),
  });
  return handoff;
}

/** MS-01 xodim bosh sahifasi (T-120). */
export function StaffDashboardPage() {
  const me = useMe();
  const navigate = useNavigate();
  const query = useStaffKpi(me.activeRole === 'director');
  const handoff = useOpenPanel();
  return (
    <>
      {handoff.isError && <Alert error={handoff.error} />}
      <QueryView query={query}>
        {(k) => (
          <StaffDashboardView
            k={k}
            onOpen={(target) => {
              const to = KPI_ROUTES[target];
              if (to) void navigate({ to });
            }}
          />
        )}
      </QueryView>
    </>
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
  const [q, setQ] = useState('');
  const query = useStudentSearch(q);
  return (
    <SearchView
      query={q}
      results={query.data ?? []}
      onQuery={setQ}
      onOpen={(s) => void navigate({ to: '/staff/student/$id', params: { id: s.id } })}
    />
  );
}

export function StaffStudentPage() {
  const { id } = useParams({ from: '/staff/student/$id' });
  const query = useStudentCard(id);
  return (
    <QueryView query={query}>
      {(d) => <StudentCardView s={d.hit} guardians={d.guardians} />}
    </QueryView>
  );
}
