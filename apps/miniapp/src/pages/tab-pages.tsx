import { useState } from 'react';
import { CHILD_TABS, RESULTS } from '../screens/guardian/mock.js';
import { ResultsView } from '../screens/guardian/results.js';
import { APPROVALS, KPI, QUEUE, STUDENTS } from '../screens/staff/mock.js';
import { StaffDashboardView } from '../screens/staff/dashboard.js';
import { ReviewView } from '../screens/staff/review.js';
import { ApprovalsView } from '../screens/staff/approvals.js';
import { SearchView } from '../screens/staff/search.js';

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
