import { formatDateTime, webMessages as t } from '@lg/i18n';
import {
  Badge,
  Button,
  Card,
  type ColumnDef,
  DataTable,
  Drawer,
  PageHeader,
  Tabs,
} from '@lg/ui-web';
import { AlertOctagon, Eye, Search } from 'lucide-react';
import { useState } from 'react';
import type {
  AuditAction,
  AuditLogItem,
  AuditModule,
  StaffActivityItem,
  SuspiciousActivityItem,
} from './types.js';

interface Props {
  logs: readonly AuditLogItem[];
  suspicious: readonly SuspiciousActivityItem[];
  staffActivity: readonly StaffActivityItem[];
  activeTab?: 'log' | 'suspicious' | 'staffActivity';
}

const ACTION_TONES: Record<AuditAction, 'success' | 'warning' | 'danger' | 'info'> = {
  create: 'success',
  update: 'warning',
  delete: 'danger',
  login: 'info',
};

const MODULE_NAMES: Record<AuditModule, string> = {
  finance: 'Moliya',
  students: 'Oʻquvchilar',
  attendance: 'Davomat',
  system: 'Tizim',
};

const logColumns = (
  onViewDiff: (item: AuditLogItem) => void,
): ColumnDef<AuditLogItem, unknown>[] => [
  {
    accessorKey: 'timestamp',
    header: t.audit.cols.timestamp,
    cell: ({ row }) => formatDateTime(row.original.timestamp),
  },
  {
    accessorKey: 'userName',
    header: t.audit.cols.user,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-text">{row.original.userName}</span>
        <span className="text-xs text-text-muted">{row.original.userRole}</span>
      </div>
    ),
  },
  {
    accessorKey: 'module',
    header: t.audit.cols.module,
    cell: ({ row }) => <Badge tone="muted">{MODULE_NAMES[row.original.module]}</Badge>,
  },
  {
    accessorKey: 'action',
    header: t.audit.cols.action,
    cell: ({ row }) => (
      <Badge tone={ACTION_TONES[row.original.action]}>{t.audit.actions[row.original.action]}</Badge>
    ),
  },
  {
    accessorKey: 'target',
    header: t.audit.cols.target,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.target}</span>,
  },
  {
    accessorKey: 'ip',
    header: t.audit.cols.ip,
    cell: ({ row }) => <span className="font-mono text-xs text-text-muted">{row.original.ip}</span>,
  },
  {
    id: 'diff',
    header: t.audit.cols.diff,
    cell: ({ row }) =>
      row.original.diff && row.original.diff.length > 0 ? (
        <Button
          variant="secondary"
          className="h-8 px-2 text-xs"
          onClick={() => onViewDiff(row.original)}
        >
          <Eye className="size-3.5" aria-hidden />
          Diff
        </Button>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
];

const staffColumns: ColumnDef<StaffActivityItem, unknown>[] = [
  {
    accessorKey: 'staffName',
    header: t.audit.activity.name,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-text">{row.original.staffName}</span>
        <span className="text-xs text-text-muted">{row.original.role}</span>
      </div>
    ),
  },
  { accessorKey: 'paymentsCount', header: t.audit.activity.paymentsCount },
  { accessorKey: 'approvalsCount', header: t.audit.activity.approvalsCount },
  {
    accessorKey: 'avgResponseTime',
    header: t.audit.activity.avgResponseTime,
    cell: ({ row }) => (
      <span className="font-medium text-primary">{row.original.avgResponseTime}</span>
    ),
  },
];

function AuditLogTab({
  logs,
  onViewDiff,
}: {
  logs: readonly AuditLogItem[];
  onViewDiff: (item: AuditLogItem) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = logs.filter(
    (l) =>
      l.userName.toLowerCase().includes(query.toLowerCase()) ||
      l.target.toLowerCase().includes(query.toLowerCase()) ||
      l.ip.includes(query),
  );

  return (
    <>
      <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border border-border bg-bg px-3">
        <Search className="size-4 text-text-muted" aria-hidden />
        <input
          type="search"
          aria-label={t.audit.filters.search}
          placeholder={t.audit.filters.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-10 flex-1 bg-transparent text-sm text-text outline-none"
        />
      </div>

      <DataTable
        data={filtered}
        columns={logColumns(onViewDiff)}
        getRowId={(r) => r.id}
        empty={{ title: t.audit.empty }}
      />
    </>
  );
}

function SuspiciousList({ suspicious }: { suspicious: readonly SuspiciousActivityItem[] }) {
  return (
    <div className="space-y-3">
      {suspicious.map((s) => (
        <Card
          key={s.id}
          className={`p-4 border-l-4 ${
            s.riskLevel === 'high'
              ? 'border-l-danger bg-danger-bg/20'
              : 'border-l-warning bg-warning-bg/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon
                className={`size-5 ${s.riskLevel === 'high' ? 'text-danger' : 'text-warning'}`}
                aria-hidden
              />
              <h4 className="font-semibold text-text">{s.title}</h4>
            </div>
            <span className="text-xs text-text-muted">{formatDateTime(s.timestamp)}</span>
          </div>
          <p className="mt-1 text-sm text-text">{s.description}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span>Foydalanuvchi: {s.userName}</span>
            <Badge tone={s.riskLevel === 'high' ? 'danger' : 'warning'}>
              {s.riskLevel === 'high' ? t.audit.suspicious.riskHigh : t.audit.suspicious.riskMedium}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AuditDiffDrawerContent({ log }: { log: AuditLogItem }) {
  if (!log.diff) return null;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="rounded-md border border-border bg-surface p-3 text-xs">
        <p className="font-semibold text-text">{log.target}</p>
        <p className="text-text-muted mt-0.5">
          {log.userName} ({log.userRole}) • {formatDateTime(log.timestamp)}
        </p>
      </div>
      <div className="space-y-2">
        {log.diff.map((d) => (
          <div key={d.field} className="rounded-md border border-border p-3">
            <span className="font-mono text-xs font-semibold text-primary">{d.field}</span>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-danger-bg/40 p-2 text-danger">
                <span className="font-medium block">{t.audit.diff.before}:</span>
                <span>{d.before}</span>
              </div>
              <div className="rounded bg-success-bg/40 p-2 text-success">
                <span className="font-medium block">{t.audit.diff.after}:</span>
                <span>{d.after}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** W-30 Audit (FR-AUD-1/2/3). */
export function AuditView({ logs, suspicious, staffActivity, activeTab = 'log' }: Props) {
  const [tab, setTab] = useState<'log' | 'suspicious' | 'staffActivity'>(activeTab);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const tabItems = [
    { value: 'log' as const, label: t.audit.tabs.log, count: logs.length },
    { value: 'suspicious' as const, label: t.audit.tabs.suspicious, count: suspicious.length },
    { value: 'staffActivity' as const, label: t.audit.tabs.staffActivity },
  ];

  return (
    <>
      <PageHeader title={t.audit.title} description={t.audit.subtitle} />

      <Tabs label={t.audit.title} value={tab} items={tabItems} onChange={setTab} />

      {tab === 'log' && <AuditLogTab logs={logs} onViewDiff={setSelectedLog} />}
      {tab === 'suspicious' && <SuspiciousList suspicious={suspicious} />}
      {tab === 'staffActivity' && (
        <DataTable
          data={staffActivity}
          columns={staffColumns}
          getRowId={(r) => r.staffName}
          numeric={['paymentsCount', 'approvalsCount']}
          empty={{ title: t.audit.empty }}
        />
      )}

      <Drawer
        open={Boolean(selectedLog)}
        title={t.audit.diff.title}
        closeLabel={t.common.cancel}
        onClose={() => setSelectedLog(null)}
      >
        {selectedLog && <AuditDiffDrawerContent log={selectedLog} />}
      </Drawer>
    </>
  );
}
