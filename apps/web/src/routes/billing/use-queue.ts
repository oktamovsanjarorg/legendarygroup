import type { PaymentSubmission } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

/** W-14: kutilayotgan cheklar, eng eskisi birinchi (BR-13: 24 soatdan oshgani belgilanadi). */
export const usePendingSubmissions = () =>
  useQuery({
    queryKey: ['billing', 'submissions', 'pending'],
    queryFn: async () =>
      [
        ...(await api.request<PaymentSubmission[]>('/billing/submissions?status=pending_review')),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    refetchInterval: 30_000,
  });

export type Decision =
  { id: string; kind: 'confirm'; amount: bigint } | { id: string; kind: 'reject'; reason: string };

/** Qaror (FR-PAY-4): avval qulf (ikki admin bir chekni ikki marta tasdiqlamasin), so'ng amal. */
export function useDecideSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: Decision) => {
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
    onSettled: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}
