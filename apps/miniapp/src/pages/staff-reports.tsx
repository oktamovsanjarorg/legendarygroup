import { REPORT_TYPES, type ReportType } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ForbiddenState, useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { shiftPeriod } from '../data/staff-finance.js';
import {
  hasPeriod,
  REPORT_GROUPS,
  reportFilter,
  type ReportGroupBy,
  reportTypesFor,
  useForecasts,
  useReport,
  useSendReport,
} from '../data/staff-reports.js';
import { ForecastsView } from '../screens/staff/forecasts.js';
import { ReportDetailView, ReportsMenuView } from '../screens/staff/reports.js';
import { useMe } from '../session/session.js';
import { ErrorNotice, OkNotice } from './notice.js';

const c = t.staffReports;

/** Kartochkadan orqaga — shu hisobotga. */
function useOpenStudent() {
  const navigate = useNavigate();
  return (id: string) => void navigate({ to: '/staff/student/$id', params: { id } });
}

/** MS-29 Hisobotlar (T-158). */
export function StaffReportsPage() {
  const navigate = useNavigate();
  const { permissions } = useMe();
  return (
    <ReportsMenuView
      types={reportTypesFor(permissions)}
      onOpen={(type) => void navigate({ to: '/staff/reports/$type', params: { type } })}
    />
  );
}

function Report({ type }: { type: ReportType }) {
  const haptic = useHaptic();
  const toStudent = useOpenStudent();
  const current = useClock().today().slice(0, 7);
  const groups = REPORT_GROUPS[type] ?? [];
  const [period, setPeriod] = useState(current);
  const [groupBy, setGroupBy] = useState<ReportGroupBy | null>(groups[0] ?? null);
  const filter = reportFilter(type, groupBy, { period, current });
  const send = useSendReport(type);
  const sent = send.data && (send.data.status === 'queued' ? c.queued : c.alreadySent);
  return (
    <>
      <ErrorNotice error={send.error} />
      <OkNotice text={sent ?? null} />
      <QueryView query={useReport(type, filter)}>
        {(view) => (
          <ReportDetailView
            type={type}
            view={view}
            groups={groups}
            groupBy={groupBy}
            onGroupBy={setGroupBy}
            period={
              hasPeriod(type, groupBy)
                ? { value: period, current, onStep: (s) => setPeriod((x) => shiftPeriod(x, s)) }
                : null
            }
            sending={send.isPending}
            onSend={(format) =>
              send.mutate(
                { format, ...filter },
                { onSuccess: () => haptic.success(), onError: () => haptic.error() },
              )
            }
            onStudent={toStudent}
          />
        )}
      </QueryView>
    </>
  );
}

export function StaffReportPage() {
  const params = useParams({ from: '/staff/reports/$type' });
  const navigate = useNavigate();
  const type = REPORT_TYPES.find((x) => x === params.type);
  if (!type) return <ForbiddenState onHome={() => void navigate({ to: '/staff/reports' })} />;
  return <Report key={type} type={type} />;
}

/** MS-30 Prognozlar (T-159). */
export function StaffForecastsPage() {
  const { permissions } = useMe();
  const toStudent = useOpenStudent();
  return (
    <QueryView query={useForecasts(permissions.includes('finance.view'))}>
      {(data) => <ForecastsView data={data} onStudent={toStudent} />}
    </QueryView>
  );
}
