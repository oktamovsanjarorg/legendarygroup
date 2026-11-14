import type {
  Invoice,
  InvoiceWithLines,
  LessonDto,
  PaymentDetail,
  StudentLedgerSummary,
  StudentListRow,
} from '@lg/contracts';
import type { ApiClient } from '@lg/ui-core';
import { useQuery } from '@tanstack/react-query';
import { useApi, useClock } from './deps.js';
import {
  type AttendanceRow,
  childSummary,
  invoiceRows,
  paidAmount,
  paymentRows,
} from './guardian-map.js';
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
