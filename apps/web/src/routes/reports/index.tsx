import type {
  AttendanceReportResponse,
  DebtAgingResponse,
  LeadsConversionReportResponse,
  RevenueReportResponse,
  TeacherPerformanceReportResponse,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { ForbiddenState } from '@lg/ui-web';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import type { ReportKpi } from '../../screens/f3/types.js';
import { type ReportData, type ReportTab, ReportsView } from '../../screens/f3/w26-reports.js';
import { download } from '../billing/download.js';
import {
  bp,
  FINANCE_TABS,
  REPORT_TYPE,
  toAgingRows,
  toAttendanceRows,
  toConversionRows,
  toRevenueRows,
  toTeacherRows,
} from './map.js';

const ALL_TABS: readonly ReportTab[] = ['revenue', 'aging', 'attendance', 'conversion', 'teachers'];
const get = <T,>(path: string) => api.request<T>(`/reports/${path}`);

async function fetchTab(tab: ReportTab): Promise<ReportData> {
  switch (tab) {
    case 'revenue':
      return { tab, rows: toRevenueRows(await get<RevenueReportResponse>('revenue')) };
    case 'aging':
      return { tab, rows: toAgingRows(await get<DebtAgingResponse>('debt-aging')) };
    case 'attendance':
      return { tab, rows: toAttendanceRows(await get<AttendanceReportResponse>('attendance')) };
    case 'conversion':
      return { tab, rows: toConversionRows(await get<LeadsConversionReportResponse>('leads')) };
    default:
      return {
        tab,
        rows: toTeacherRows(await get<TeacherPerformanceReportResponse>('teacher-performance')),
      };
  }
}

const useReport = <T,>(path: string, enabled = true) =>
  useQuery({ queryKey: ['reports', 'kpi', path], queryFn: () => get<T>(path), enabled });

/** KPI: moliyaviy ko'rsatkichlar faqat `finance.view` bilan so'raladi. */
function useKpi(finance: boolean): ReportKpi {
  const month = todayYmd().slice(0, 7);
  const revenue = useReport<RevenueReportResponse>(`revenue?from=${month}&to=${month}`, finance);
  const aging = useReport<DebtAgingResponse>('debt-aging', finance);
  const att = useReport<AttendanceReportResponse>('attendance');
  const leads = useReport<LeadsConversionReportResponse>('leads');
  return {
    revenue: revenue.data ? BigInt(revenue.data.totalRevenue) : null,
    debtors: aging.data?.totalDebtors ?? null,
    attendancePercent: att.data ? bp(att.data.overallAttendancePercentBp) : null,
    conversionPercent: leads.data ? bp(leads.data.overallConversionPercentBp) : null,
  };
}

function ReportsScreen({ finance }: { finance: boolean }) {
  const tabs = finance ? ALL_TABS : ALL_TABS.filter((x) => !FINANCE_TABS.includes(x));
  const [tab, setTab] = useState<ReportTab>(tabs[0] ?? 'attendance');
  const kpi = useKpi(finance);
  const data = useQuery({ queryKey: ['reports', 'tab', tab], queryFn: () => fetchTab(tab) });
  const exp = useMutation({
    mutationFn: (format: 'excel' | 'pdf') =>
      download(
        `/reports/${REPORT_TYPE[tab]}/export/${format}`,
        `${REPORT_TYPE[tab]}-${todayYmd()}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      ),
  });
  return (
    <ReportsView
      tabs={tabs}
      tab={tab}
      onTab={setTab}
      data={data.data}
      kpi={kpi}
      loading={data.isPending}
      loadError={data.isError ? errorView(data.error, () => void data.refetch()) : undefined}
      onExport={(f) => exp.mutate(f)}
      exporting={exp.isPending}
      exportError={exp.isError ? `${t.reports.exportFailed}: ${errorText(exp.error)}` : undefined}
    />
  );
}

/** W-26 Hisobotlar (T-501, FR-DASH-2/4): `stats.operational`; moliya tablari — `finance.view`. */
export function ReportsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('stats.operational'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <ReportsScreen finance={permissions.has('finance.view')} />;
}
