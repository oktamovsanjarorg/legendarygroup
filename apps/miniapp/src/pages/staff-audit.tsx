import type { AuditLogItem } from '@lg/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  type AuditFilter,
  useAuditLog,
  useStaffActivity,
  useSuspicious,
} from '../data/staff-audit.js';
import { shiftPeriod } from '../data/staff-finance.js';
import {
  AuditItemView,
  AuditLogList,
  AuditScreen,
  type AuditTab,
  StaffActivityList,
  SuspiciousList,
} from '../screens/staff/audit.js';

const itemKey = (id: string) => ['staff', 'audit', 'item', id];

function LogTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AuditFilter>('all');
  const query = useAuditLog(filter);
  return (
    <QueryView query={query}>
      {(data) => (
        <AuditLogList
          items={data.pages.flat()}
          filter={filter}
          hasMore={query.hasNextPage}
          onFilter={setFilter}
          onMore={() => void query.fetchNextPage()}
          onOpen={(x) => {
            qc.setQueryData(itemKey(x.id), x);
            void navigate({ to: '/staff/audit/$id', params: { id: x.id } });
          }}
        />
      )}
    </QueryView>
  );
}

function StaffTab() {
  const current = useClock().today().slice(0, 7);
  const [period, setPeriod] = useState(current);
  return (
    <QueryView query={useStaffActivity(period)}>
      {(items) => (
        <StaffActivityList
          items={items}
          period={period}
          current={current}
          onPeriod={(s) => setPeriod(shiftPeriod(period, s))}
        />
      )}
    </QueryView>
  );
}

const SuspiciousTab = () => (
  <QueryView query={useSuspicious()}>{(items) => <SuspiciousList items={items} />}</QueryView>
);

/** MS-33 Audit (T-162). */
export function StaffAuditPage() {
  const [tab, setTab] = useState<AuditTab>('log');
  return (
    <AuditScreen tab={tab} onTab={setTab}>
      {tab === 'log' && <LogTab />}
      {tab === 'suspicious' && <SuspiciousTab />}
      {tab === 'staff' && <StaffTab />}
    </AuditScreen>
  );
}

/** Yozuv ro'yxatdan ochiladi; sahifa yangilansa — ro'yxatga qaytadi. */
export function StaffAuditItemPage() {
  const { id } = useParams({ from: '/staff/audit/$id' });
  const item = useQueryClient().getQueryData<AuditLogItem>(itemKey(id));
  return item ? <AuditItemView item={item} /> : <Navigate to="/staff/audit" replace />;
}
