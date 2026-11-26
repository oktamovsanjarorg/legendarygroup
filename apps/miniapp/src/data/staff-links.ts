import type {
  GuardianLinkRequest,
  ApproveGuardianLinkRequest as Approve,
  StudentListRow,
} from '@lg/contracts';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'link-requests'] as const;
export type Relation = NonNullable<Approve['relation']>;

/** MS-11: kutilayotgan so'rovlar, eng eskisi birinchi (navbat). */
export function useLinkRequests() {
  const api = useApi();
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const r = await api.request<{ items: GuardianLinkRequest[] }>(
        '/guardians/link-requests?status=pending&limit=100',
      );
      return [...r.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
  });
}

/** Farzandni tanlash: qidirmasdan — A–Z ro'yxat, yozilsa — ism/ID (qarzsiz; T-178). */
export function useStudentPick(q: string) {
  const api = useApi();
  const query = q.trim();
  return useQuery({
    queryKey: ['staff', 'pick', query],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await api.request<{ items: StudentListRow[] }>(
          `/students?sort=name&limit=20${query.length >= 2 ? `&q=${encodeURIComponent(query)}` : ''}`,
        )
      ).items,
  });
}

export type LinkDecision =
  | { kind: 'approve'; req: GuardianLinkRequest; studentId: string; relation: Relation }
  | { kind: 'reject'; req: GuardianLinkRequest; reason: string };

export function useDecideLink() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: LinkDecision) =>
      api.request(`/guardians/link-requests/${d.req.id}/${d.kind}`, {
        method: 'POST',
        body:
          d.kind === 'approve'
            ? { studentId: d.studentId, relation: d.relation }
            : { reason: d.reason },
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
