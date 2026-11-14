import type { OwnPayrollMonth, PayrollRunDetail } from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { payrollDetail, payrollMonths } from './payroll-map.js';

/** MT-11 ustoz oyligi (FR-SAL-4): faqat o'ziniki — server cheklaydi (payroll.view_own). */
export function useOwnPayroll() {
  const api = useApi();
  return useQuery({
    queryKey: ['teacher', 'payroll'],
    queryFn: async () => payrollMonths(await api.request<OwnPayrollMonth[]>('/payroll/my')),
  });
}

export function useOwnPayrollDetail(runId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['teacher', 'payroll', runId],
    queryFn: async () =>
      payrollDetail(await api.request<PayrollRunDetail>(`/payroll/runs/${runId}`)),
  });
}
