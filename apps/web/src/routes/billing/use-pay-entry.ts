import type {
  CreatePaymentInput,
  PaymentDetail,
  PaymentPreview,
  StudentListResult,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

/** O'quvchi qidiruvi (W-13): kamida 2 belgi, faol o'quvchilar. */
export const usePayStudentSearch = (q: string) =>
  useQuery({
    queryKey: ['students', 'list', { q, status: 'active', for: 'pay' }],
    queryFn: () =>
      api.request<StudentListResult>(
        `/students?${new URLSearchParams({ q, status: 'active' }).toString()}`,
      ),
    enabled: q.length >= 2,
  });

/** FIFO taqsimot (BR-12) — server hisoblaydi; summa yo'q bo'lsa 0 (faqat qarz ko'rinadi). */
export const usePaymentPreview = (studentId: string | null, amount: bigint | null) =>
  useQuery({
    queryKey: ['billing', 'preview', studentId, String(amount ?? 0n)],
    queryFn: () =>
      api.request<PaymentPreview>(
        `/billing/payments/preview?${new URLSearchParams({
          studentId: studentId ?? '',
          amount: String(amount ?? 0n),
        }).toString()}`,
      ),
    enabled: studentId !== null && (amount ?? 0n) >= 0n,
    placeholderData: (prev) => prev,
  });

/**
 * To'lov yaratish (BR-11): kalit — forma ochilganda bir marta yaratiladi va qayta yuborishda
 * (tarmoq xatosi, ikki marta bosish) o'zgarmaydi; server o'sha to'lovni qaytaradi.
 */
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: CreatePaymentInput }) =>
      api.request<PaymentDetail>('/billing/payments', {
        method: 'POST',
        body,
        headers: { 'idempotency-key': key },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Chek PDF'ni yangi oynada ochadi (auth sarlavhasi bilan yuklab). */
export async function openReceiptPdf(receiptNumber: string): Promise<void> {
  const blob = await api.blob(`/billing/receipts/${encodeURIComponent(receiptNumber)}/pdf`);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
