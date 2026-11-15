import type {
  AuditLogItem as ApiLog,
  StaffActivityItem as ApiStaff,
  SuspiciousActivityItem as ApiSuspicious,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../api/client.js';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import type {
  AuditAction,
  AuditLogItem,
  AuditModule,
  StaffActivityItem,
  SuspiciousActivityItem,
} from '../../screens/f3/types.js';
import { AuditView } from '../../screens/f3/w30-audit.js';

const FINANCE = [
  'payment',
  'receipt',
  'invoice',
  'expense',
  'payroll',
  'enrollment_discount',
  'cash',
  'ledger',
  'payment_submission',
  'approval_request',
];
const STUDENTS = ['student', 'guardian', 'enrollment', 'lead', 'guardian_link_request'];

/** `entity` → bo'lim (ko'rinish uchun guruhlash). */
export const moduleOf = (entity: string): AuditModule => {
  const e = entity.split('.')[0] ?? entity;
  if (FINANCE.some((x) => e.startsWith(x))) return 'finance';
  if (STUDENTS.some((x) => e.startsWith(x))) return 'students';
  if (e.startsWith('attendance') || e.startsWith('lesson')) return 'attendance';
  return 'system';
};

/** `payment.create` / `user.login` → amal turi. */
export const actionOf = (action: string): AuditAction => {
  const verb = action.split('.').at(-1) ?? '';
  if (/^(create|add|generate|grant|enroll)/.test(verb)) return 'create';
  if (/^(delete|remove|reverse|cancel|archive|revoke|reject|waive)/.test(verb)) return 'delete';
  if (/^(login|logout|refresh)/.test(verb) || action.startsWith('auth.')) return 'login';
  if (/^(update|set|edit|mark|approve|confirm|decide|close|pay|transfer|restore)/.test(verb))
    return 'update';
  return 'other';
};

const str = (v: unknown): string =>
  v === null || v === undefined
    ? '—'
    : typeof v === 'object'
      ? JSON.stringify(v)
      : String(v as string | number);

export const toLog = (l: ApiLog): AuditLogItem => ({
  id: l.id,
  timestamp: new Date(l.timestamp),
  userName: l.userName,
  userRole: l.userRole in t.roles ? t.roles[l.userRole as keyof typeof t.roles] : l.userRole,
  module: moduleOf(l.entity),
  action: actionOf(l.action),
  target: l.target,
  ip: l.ip ?? '',
  diff: l.diff?.map((d) => ({ field: d.field, before: str(d.before), after: str(d.after) })),
});

const toSuspicious = (s: ApiSuspicious): SuspiciousActivityItem => ({
  ...s,
  timestamp: new Date(s.timestamp),
});
const toStaff = (s: ApiStaff): StaffActivityItem => ({
  staffName: s.staffName,
  role: t.roles[s.role],
  paymentsCount: s.paymentsCount,
  approvalsCount: s.approvalsCount,
  avgResponseTime: s.avgResponseTimeFormatted,
});

function AuditScreen() {
  const [logs, suspicious, staff] = useQueries({
    queries: [
      {
        queryKey: ['audit', 'logs'],
        queryFn: () => api.request<ApiLog[]>('/audit/logs?limit=100'),
      },
      {
        queryKey: ['audit', 'suspicious'],
        queryFn: () => api.request<ApiSuspicious[]>('/audit/suspicious'),
      },
      {
        queryKey: ['audit', 'staff'],
        queryFn: () => api.request<ApiStaff[]>('/audit/staff-activity'),
      },
    ],
  });
  const failed = [logs, suspicious, staff].find((q) => q.isError);
  if (failed) return <ErrorState {...errorView(failed.error, () => void failed.refetch())} />;
  if (!logs.data || !suspicious.data || !staff.data) return <LoadingState rows={6} />;
  return (
    <AuditView
      logs={logs.data.map(toLog)}
      suspicious={suspicious.data.map(toSuspicious)}
      staffActivity={staff.data.map(toStaff)}
    />
  );
}

/** W-30 Audit (T-404, FR-AUD-1/2/3): `audit.view`. */
export function AuditPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('audit.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <AuditScreen />;
}
