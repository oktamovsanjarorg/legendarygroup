import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CHILDREN, CHILD_TABS, INVOICES, PAYMENTS, RESULTS } from '../screens/guardian/mock.js';
import { GuardianHomeView } from '../screens/guardian/home.js';
import { PaymentsView } from '../screens/guardian/payments.js';
import { ResultsView } from '../screens/guardian/results.js';
import { MoreView } from '../screens/guardian/more.js';
import { APPROVALS, KPI, QUEUE, STUDENTS } from '../screens/staff/mock.js';
import { StaffDashboardView } from '../screens/staff/dashboard.js';
import { ReviewView } from '../screens/staff/review.js';
import { ApprovalsView } from '../screens/staff/approvals.js';
import { SearchView } from '../screens/staff/search.js';
import { MONTHS } from '../screens/teacher/mock-more.js';
import { PayrollView } from '../screens/teacher/payroll.js';

export function TeacherProfilePage() {
  const navigate = useNavigate();
  return (
    <PayrollView
      months={MONTHS}
      onOpen={() => undefined}
      onSettings={() => void navigate({ to: '/settings' })}
    />
  );
}

export function GuardianHomePage() {
  const [childId, setChildId] = useState(CHILDREN[0]?.id ?? 'c1');
  const navigate = useNavigate();
  return (
    <GuardianHomeView
      items={CHILDREN}
      selected={childId}
      onSelect={setChildId}
      onPay={() => void navigate({ to: '/payments' })}
    />
  );
}

export function GuardianResultsPage() {
  const [childId, setChildId] = useState(CHILD_TABS[0]?.id ?? 'c1');
  return (
    <ResultsView
      childTabs={CHILD_TABS}
      selected={childId}
      onSelect={setChildId}
      data={RESULTS}
      onTest={() => undefined}
    />
  );
}

export function GuardianPaymentsPage() {
  const navigate = useNavigate();
  return (
    <PaymentsView
      childName="Aliyeva Madina"
      debt={650000n}
      invoices={INVOICES}
      payments={PAYMENTS}
      onPay={() => void navigate({ to: '/payments' })}
      onReceipt={() => undefined}
    />
  );
}

export function GuardianMorePage() {
  const navigate = useNavigate();
  return (
    <MoreView
      onOpen={(target) => {
        if (target === 'settings') void navigate({ to: '/settings' });
      }}
    />
  );
}

export function StaffDashboardPage() {
  return <StaffDashboardView k={KPI} onOpen={() => undefined} />;
}

export function StaffQueuePage() {
  const first = QUEUE[0];
  if (!first) return null;
  return (
    <ReviewView
      item={first}
      position={1}
      total={QUEUE.length}
      onApprove={() => undefined}
      onReject={() => undefined}
    />
  );
}

export function StaffApprovalsPage() {
  return <ApprovalsView items={APPROVALS} onOpen={() => undefined} />;
}

export function StaffSearchPage() {
  const [q, setQ] = useState('');
  return <SearchView query={q} results={STUDENTS} onQuery={setQ} onOpen={() => undefined} />;
}
