import type {
  GroupDetail,
  StudentBillingSetupRequest,
  StudentBillingSetupState,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

export interface SetupGroup {
  enrollmentId: string;
  groupId: string;
  name: string;
  price: bigint;
}

export interface SetupRow {
  startDate: string;
  /** To'lanmagan oylar: davr → summa (`null` — summa hali kiritilmagan). */
  unpaid: Readonly<Record<string, bigint | null>>;
}

/** Kelgan oydan o'tgan oygacha (joriy oy — tizim o'zi hisoblaydi). */
export function monthsBefore(startDate: string, today: string): string[] {
  const out: string[] = [];
  const end = today.slice(0, 7);
  let [y, m] = startDate.slice(0, 7).split('-').map(Number) as [number, number];
  for (let p = startDate.slice(0, 7); p < end;) {
    out.push(p);
    m += 1;
    if (m > 12) [y, m] = [y + 1, 1];
    p = `${y}-${String(m).padStart(2, '0')}`;
  }
  return out;
}

/** Ekran holati → API so'rovi; summasiz yoki diapazondan tashqari oylar tashlanadi. */
export function setupRequest(
  groups: readonly SetupGroup[],
  rows: Readonly<Record<string, SetupRow>>,
  today: string,
): StudentBillingSetupRequest {
  const enrollments = [];
  const openingDebts = [];
  for (const g of groups) {
    const r = rows[g.enrollmentId];
    if (!r) continue;
    enrollments.push({ enrollmentId: g.enrollmentId, startDate: r.startDate });
    const months = new Set(monthsBefore(r.startDate, today));
    for (const [period, amount] of Object.entries(r.unpaid))
      if (months.has(period) && amount !== null && amount > 0n)
        openingDebts.push({ enrollmentId: g.enrollmentId, period, amount: amount.toString() });
  }
  return { enrollments, openingDebts };
}

export function useBillingSetupState(studentId: string, enabled: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'setup', studentId],
    queryFn: () => api.request<StudentBillingSetupState>(`/billing/students/${studentId}/setup`),
    enabled,
  });
}

export function useGroupPrices(groupIds: readonly string[]) {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'group-prices', ...groupIds],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          groupIds.map(async (id) => {
            const g = await api.request<GroupDetail>(`/groups/${id}`);
            return [id, BigInt(g.monthlyPrice)] as const;
          }),
        ),
      ),
  });
}

export function useBillingSetup(studentId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StudentBillingSetupRequest) =>
      api.request<StudentBillingSetupState>(`/billing/students/${studentId}/setup`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      void qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}
