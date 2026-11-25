import type {
  ApprovalRequest as ApiApproval,
  DirectorDashboardKpi,
  EnrollmentDto,
  PaymentSubmission,
  StudentDetail,
  StudentLedgerSummary,
  StudentListRow,
} from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { approvalRequest, queueItem, staffKpi, studentHit } from './staff-map.js';

/** Xodim (Director/Admin) Mini App'i (T-120). */
export function useStaffKpi(isDirector: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'kpi'],
    queryFn: async () =>
      staffKpi(await api.request<DirectorDashboardKpi>('/dashboard/director'), isDirector),
  });
}

/** MS-02 chek navbati: kutilayotganlar (eng eskisi birinchi), joriy chek rasmi (5 daq havola). */
export function useReviewQueue(index: number, meId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'queue', index],
    queryFn: async () => {
      const list = await api.request<PaymentSubmission[]>(
        '/billing/submissions?status=pending_review',
      );
      const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const current = sorted[Math.min(index, sorted.length - 1)];
      if (!current) return { item: null, total: 0, position: 0 };
      const image = current.fileId
        ? (await api.request<{ url: string }>(`/files/${current.fileId}/url`)).url
        : '';
      return {
        item: queueItem(current, sorted, image, meId),
        total: sorted.length,
        position: sorted.indexOf(current) + 1,
      };
    },
  });
}

/** Ko'rib chiqish: avval yumshoq lock (parallel tasdiqlashdan himoya, BR-14), keyin qaror. */
export function useReviewDecision() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      d:
        | { id: string; kind: 'confirm'; amount: bigint }
        | { id: string; kind: 'reject'; reason: string },
    ) => {
      await api.request(`/billing/submissions/${d.id}/lock`, { method: 'POST' });
      return d.kind === 'confirm'
        ? api.request(`/billing/submissions/${d.id}/confirm`, {
            method: 'POST',
            body: { amount: d.amount.toString() },
          })
        : api.request(`/billing/submissions/${d.id}/reject`, {
            method: 'POST',
            body: { reason: d.reason },
          });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useApprovals() {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'approvals'],
    queryFn: async () =>
      (await api.request<ApiApproval[]>('/approvals?status=pending')).map(approvalRequest),
  });
}

export function useApproval(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'approvals', id],
    queryFn: async () => approvalRequest(await api.request<ApiApproval>(`/approvals/${id}`)),
  });
}

export function useDecideApproval(id: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { decision: 'approve' | 'reject'; note?: string }) =>
      api.request(`/approvals/${id}/decide`, { method: 'POST', body: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

const debtOf = async (api: ReturnType<typeof useApi>, id: string) =>
  -BigInt((await api.request<StudentLedgerSummary>(`/billing/ledger/${id}/summary`)).balance);

/** MS-04 qidiruv: kamida 2 belgi; qarz — har topilgan o'quvchi uchun (≤ 20). */
export function useStudentSearch(q: string) {
  const api = useApi();
  const query = q.trim();
  return useQuery({
    queryKey: ['staff', 'search', query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const { items } = await api.request<{ items: StudentListRow[] }>(
        `/students?q=${encodeURIComponent(query)}&limit=20`,
      );
      return Promise.all(items.map(async (s) => studentHit(s, await debtOf(api, s.id))));
    },
  });
}

export function useStudentCard(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'student', id],
    queryFn: async () => {
      const [s, enrollments, debt] = await Promise.all([
        api.request<StudentDetail>(`/students/${id}`),
        api.request<EnrollmentDto[]>(`/students/${id}/enrollments`),
        debtOf(api, id),
      ]);
      // Bugun amaldagi guruhlar (muzlatilgani ham — o'quvchi guruhda).
      const groups = enrollments
        .filter((e) => e.state === 'active' || e.state === 'frozen')
        .map((e) => e.group);
      return {
        hit: studentHit({ ...s, groups, frozen: false, guardian: null }, debt),
        enrollments,
        student: s,
        archivedAt: s.archivedAt,
        guardians: s.guardians.map((g) => ({
          id: g.guardianId,
          isPrimary: g.isPrimary,
          notify: g.notify,
          name: g.fullName,
          relation: t.studentCard.relations[g.relation],
          phone: g.phone ?? '',
          telegramLinked: g.linked,
        })),
      };
    },
  });
}
