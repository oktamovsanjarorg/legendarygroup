import type { CreatePaymentInput, PaymentDetail, PaymentPreview } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PayPreview } from '../screens/staff/pay.js';
import { useApi } from './deps.js';

/** API (pul — string) → ekran (bigint). */
export const payPreview = (p: PaymentPreview): PayPreview => ({
  debt: BigInt(p.debt),
  parts: p.parts.map((x) => ({ period: x.period, amount: BigInt(x.amount), closes: x.closes })),
  advance: BigInt(p.advance),
});

/** BR-12 FIFO taqsimot — server hisoblaydi; summa yo'q bo'lsa 0 (faqat qarz). */
export function usePayPreview(studentId: string, amount: bigint | null) {
  const api = useApi();
  return useQuery({
    queryKey: ['billing', 'preview', studentId, String(amount ?? 0n)],
    queryFn: async () =>
      payPreview(
        await api.request<PaymentPreview>(
          `/billing/payments/preview?${new URLSearchParams({
            studentId,
            amount: String(amount ?? 0n),
          }).toString()}`,
        ),
      ),
    placeholderData: (prev) => prev,
  });
}

/**
 * To'lov yaratish (BR-11): `key` — ekran ochilganda bir marta; qayta yuborishda (tarmoq xatosi,
 * ikki marta bosish) o'zgarmaydi — server o'sha to'lovni qaytaradi.
 */
export function useCreatePayment(key: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePaymentInput) =>
      api.request<PaymentDetail>('/billing/payments', {
        method: 'POST',
        body,
        headers: { 'idempotency-key': key },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing'] });
      void qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}
