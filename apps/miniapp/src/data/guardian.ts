import type {
  PublicReceipt,
  Invoice,
  InvoiceWithLines,
  LessonDto,
  PaymentDetail,
  StudentLedgerSummary,
  StudentListRow,
  StudentProgressResponse,
} from '@lg/contracts';
import type { ApiClient } from '@lg/ui-core';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Receipt } from '../screens/guardian/receipt.js';
import { useApi, useClock } from './deps.js';
import {
  type AttendanceRow,
  childSummary,
  invoiceRows,
  METHOD,
  paidAmount,
  paymentRows,
} from './guardian-map.js';
import { childResults, type GuardianGradesHistory } from './results-map.js';
import { monthStart } from './student-map.js';
import { addDays } from './time.js';

/** Ota-ona ekranlari (T-116). Scope serverda: faqat o'z farzandlari (02 §3, 404). */
export function useChildren() {
  const api = useApi();
  return useQuery({
    queryKey: ['guardian', 'children'],
    queryFn: async () =>
      (await api.request<{ items: StudentListRow[] }>('/students?limit=100')).items.filter(
        (s) => s.archivedAt === null,
      ),
  });
}

const billing = (api: ApiClient, id: string) =>
  Promise.all([
    api.request<StudentLedgerSummary>(`/billing/ledger/${id}/summary`),
    api.request<Invoice[]>(`/billing/invoices?studentId=${id}`),
  ]);

/** MG-01 bosh sahifa: har farzand — bugun, keyingi dars, qarz. */
export function useChildSummaries(children: readonly StudentListRow[] | undefined) {
  const api = useApi();
  const clock = useClock();
  const today = clock.today();
  return useQuery({
    queryKey: ['guardian', 'summaries', today, children?.map((c) => c.id)],
    enabled: children !== undefined,
    queryFn: () =>
      Promise.all(
        (children ?? []).map(async (c) => {
          const [lessons, attendance, [ledger, invoices]] = await Promise.all([
            api.request<LessonDto[]>(
              `/students/${c.id}/lessons?from=${today}&to=${addDays(today, 14)}`,
            ),
            api.request<AttendanceRow[]>(
              `/attendance/history?studentId=${c.id}&from=${today}&to=${today}`,
            ),
            billing(api, c.id),
          ]);
          return childSummary({
            id: c.id,
            name: c.fullName,
            today,
            now: clock.now(),
            lessons,
            attendance,
            ledger,
            invoices,
          });
        }),
      ),
  });
}

/** MG-05 to'lovlar: qarz, hisoblar (to'langan qism bilan), to'lovlar tarixi. */
export function useChildPayments(studentId: string | undefined) {
  const api = useApi();
  const today = useClock().today();
  return useQuery({
    queryKey: ['guardian', 'payments', studentId],
    enabled: studentId !== undefined,
    queryFn: async () => {
      const id = studentId ?? '';
      const [[ledger, invoices], payments] = await Promise.all([
        billing(api, id),
        api.request<PaymentDetail[]>(`/billing/payments?studentId=${id}`),
      ]);
      const partial = await Promise.all(
        invoices
          .filter((i) => i.status === 'partially_paid')
          .map((i) => api.request<InvoiceWithLines>(`/billing/invoices/${i.id}`)),
      );
      const detail = new Map(partial.map((d) => [d.id, d]));
      return {
        debt: -BigInt(ledger.balance),
        invoices: invoiceRows(invoices, (i) => paidAmount(i, detail.get(i.id), payments), today),
        payments: paymentRows(payments),
      };
    },
  });
}

/** MG-02 natijalar: shu oy davomati, baholar, izohlar (faqat ota-onaga), testlar, progress. */
export function useChildResults(studentId: string | undefined) {
  const api = useApi();
  const today = useClock().today();
  return useQuery({
    queryKey: ['guardian', 'results', studentId, today],
    enabled: studentId !== undefined,
    queryFn: async () => {
      const id = studentId ?? '';
      const from = monthStart(addDays(today, -62));
      const [attendance, history, progress] = await Promise.all([
        api.request<AttendanceRow[]>(
          `/attendance/history?studentId=${id}&from=${monthStart(today)}&to=${today}`,
        ),
        api.request<GuardianGradesHistory>(
          `/grades/history?studentId=${id}&from=${from}&to=${today}`,
        ),
        // Guruhga yozilmagan bo'lsa server 404 beradi — natijalar baribir ko'rsatiladi.
        api.request<StudentProgressResponse>(`/grades/students/${id}/progress`).catch(() => null),
      ]);
      return childResults({ today, attendance, history, progress });
    },
  });
}

/** MG-05a: chek rekvizitlari (scope — API: faqat o'z farzandi). */
export function useReceipt(number: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['guardian', 'receipt', number],
    queryFn: async (): Promise<Receipt> => {
      const r = await api.request<PublicReceipt>(`/billing/receipts/${encodeURIComponent(number)}`);
      return {
        number: r.number,
        amount: BigInt(r.amount),
        date: new Date(r.paidAt),
        method: METHOD[r.method],
        cancelled: r.isCancelled,
        cancelReason: r.cancelReason,
      };
    },
  });
}

/** Chek PDF: auth bilan yuklab olinadi va ochiladi (Telegram'da — yangi oynada). */
export function useReceiptPdf() {
  const api = useApi();
  return useMutation({
    mutationFn: async (number: string) => {
      const blob = await api.blob(`/billing/receipts/${encodeURIComponent(number)}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chek-${number}.pdf`;
      a.target = '_blank';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}
