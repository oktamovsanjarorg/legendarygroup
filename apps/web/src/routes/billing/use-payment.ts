import type { PaymentDetail, PaymentMethod, PaymentView } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export const usePaymentView = (id: string) =>
  useQuery({
    queryKey: ['billing', 'payment', id],
    queryFn: () => api.request<PaymentView>(`/billing/payments/${id}/view`),
  });

/** O'quvchi to'lovlari (kartochka "Cheklar" tabi) — eng yangisi birinchi. */
export const useStudentPayments = (studentId: string) =>
  useQuery({
    queryKey: ['billing', 'payments', studentId],
    queryFn: () => api.request<PaymentDetail[]>(`/billing/payments?studentId=${studentId}`),
  });

export type PaymentAction =
  | { kind: 'reverse'; paymentId: string; reason: string; direct: boolean }
  | {
      kind: 'refund';
      studentId: string;
      amount: string;
      method: PaymentMethod;
      reason: string;
      direct: boolean;
    };

/**
 * Storno/refund (BR-16/17). Huquq yetmasa — Director'ga so'rov (T-119, 02 §5): payload
 * approval-executor bajaradigan shaklda.
 */
function send(a: PaymentAction): Promise<unknown> {
  if (a.kind === 'reverse') {
    if (a.direct)
      return api.request(`/billing/payments/${a.paymentId}/reverse`, {
        method: 'POST',
        body: { reason: a.reason },
      });
    return api.request('/approvals', {
      method: 'POST',
      body: {
        type: 'reversal',
        payload: { paymentId: a.paymentId, reason: a.reason },
        reason: a.reason,
      },
    });
  }
  const body = { studentId: a.studentId, amount: a.amount, method: a.method, reason: a.reason };
  if (a.direct) return api.request('/billing/payments/refund', { method: 'POST', body });
  return api.request('/approvals', {
    method: 'POST',
    body: { type: 'refund', payload: body, reason: a.reason },
  });
}

export function usePaymentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing'] });
      void qc.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
