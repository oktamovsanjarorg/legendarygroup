import type {
  DiscountListResponse,
  Invoice,
  InvoiceWithLines,
  PaymentDetail,
  PaymentHistory,
  PaymentMethod,
  PaymentView,
  StudentLedgerSummary,
} from '@lg/contracts';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';
import type { StaffCall } from './staff-call.js';

const KEY = ['staff', 'payments'] as const;

/** Oyning oxirgi kuni (`YYYY-MM` → `YYYY-MM-DD`). */
export const monthEnd = (period: string): string =>
  new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);

/** MS-24 markaz to'lovlari — oy bo'yicha. */
export function usePaymentHistory(period: string, method: PaymentMethod | null) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...KEY, 'history', period, method],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ from: `${period}-01`, to: monthEnd(period) });
      if (method) q.set('method', method);
      if (pageParam) q.set('cursor', pageParam);
      return api.request<PaymentHistory>(`/billing/payments/history?${q.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (d) => ({
      items: d.pages.flatMap((p) => p.items),
      total: BigInt(d.pages[0]?.total ?? '0'),
    }),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentView(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'view', id],
    queryFn: () => api.request<PaymentView>(`/billing/payments/${id}/view`),
  });
}

export interface StudentFinance {
  summary: StudentLedgerSummary;
  invoices: Invoice[];
  payments: PaymentDetail[];
}

export function useStudentFinance(studentId: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'student', studentId],
    queryFn: async (): Promise<StudentFinance> => {
      const [summary, invoices, payments] = await Promise.all([
        api.request<StudentLedgerSummary>(`/billing/ledger/${studentId}/summary`),
        api.request<Invoice[]>(`/billing/invoices?studentId=${studentId}&limit=100`),
        api.request<PaymentDetail[]>(`/billing/payments?studentId=${studentId}&limit=100`),
      ]);
      const byPeriod = [...invoices].sort((a, b) => b.period.localeCompare(a.period));
      return { summary, invoices: byPeriod, payments };
    },
  });
}

export function useInvoice(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'invoice', id],
    queryFn: () => api.request<InvoiceWithLines>(`/billing/invoices/${id}`),
  });
}

export function useDiscounts(enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'discounts'],
    queryFn: () => api.request<DiscountListResponse>('/billing/discounts'),
    enabled,
  });
}

/** Bekor qilish: bevosita (BR-16) yoki Director'ga so'rov (T-119). */
export const reverseCall = (id: string, reason: string, direct: boolean): StaffCall =>
  direct
    ? { path: `/billing/payments/${id}/reverse`, body: { reason } }
    : {
        path: '/approvals',
        body: { type: 'reversal', payload: { paymentId: id, reason }, reason },
      };

export interface RefundInput {
  studentId: string;
  amount: string;
  method: PaymentMethod;
  reason: string;
}

/** BR-17: qaytarish — Director bevosita, Admin so'rov bilan. */
export const refundCall = (
  payload: RefundInput,
  direct: boolean,
  idempotencyKey: string,
): StaffCall =>
  direct
    ? { path: '/billing/payments/refund', body: payload, idempotencyKey }
    : {
        path: '/approvals',
        body: { type: 'refund', payload, reason: payload.reason },
        idempotencyKey,
      };

/** BR-18: limit ichida — darhol, yuqori — so'rov. */
export const discountCall = (
  payload: { enrollmentId: string; percent: number; reason: string },
  direct: boolean,
): StaffCall => {
  const { enrollmentId, percent, reason } = payload;
  return direct
    ? {
        path: `/billing/enrollments/${enrollmentId}/discount`,
        method: 'PATCH',
        body: { percent, reason },
      }
    : { path: '/approvals', body: { type: 'discount', payload, reason } };
};

/** Foiz: 0–100 butun; aks holda `null`. */
export const parsePercent = (text: string): number | null =>
  /^\d{1,3}$/.test(text.trim()) && Number(text) <= 100 ? Number(text) : null;
