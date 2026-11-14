import type { PaymentSubmission, PublicSettings, TicketDetail, TicketItem } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Submission } from '../screens/guardian/submission.js';
import type { Ticket } from '../screens/guardian/tickets.js';
import { useApi } from './deps.js';
import { addDays } from './time.js';

/** Markaz kartasi (FR-PAY-3): asosiy karta, bo'lmasa birinchisi. */
export function usePaymentCard() {
  const api = useApi();
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: async () => {
      const s = await api.request<PublicSettings>('/settings/public');
      const card = s.paymentCards.find((c) => c.isPrimary) ?? s.paymentCards[0];
      return card ? { number: card.cardNumber, holder: card.holderName } : null;
    },
  });
}

export const toSubmission = (s: PaymentSubmission): Submission => ({
  childName: s.studentName ?? '',
  amount: BigInt(s.amountClaimed),
  sentAt: new Date(s.createdAt),
  status:
    s.status === 'confirmed'
      ? { kind: 'confirmed', receiptNo: s.receiptNumber ?? '' }
      : s.status === 'rejected'
        ? { kind: 'rejected', reason: s.rejectReason ?? '' }
        : { kind: 'pending_review' },
});

/** MG-03 chek yuborish (T-206): fayl allaqachon yuklangan (`fileId`). */
export function useSubmitReceipt() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { studentId: string; amount: bigint; comment: string; fileId: string }) =>
      api.request<PaymentSubmission>('/billing/submissions', {
        method: 'POST',
        body: {
          studentId: v.studentId,
          amountClaimed: v.amount.toString(),
          comment: v.comment || undefined,
          fileId: v.fileId,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian', 'submissions'] }),
  });
}

export function useMySubmission(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['guardian', 'submissions', id],
    queryFn: async () => {
      const list = await api.request<PaymentSubmission[]>('/billing/submissions/my');
      const s = list.find((x) => x.id === id);
      return s ? { submission: toSubmission(s), studentId: s.studentId } : null;
    },
  });
}

/** MG-08 "kela olmaydi" (FR-ATT-7): bugun yoki ertaga. */
export function useSendAbsence(today: string) {
  const api = useApi();
  return useMutation({
    mutationFn: (v: { childId: string; day: 'today' | 'tomorrow'; reason: string }) =>
      api.request('/attendance/absence-notices', {
        method: 'POST',
        body: {
          studentId: v.childId,
          date: v.day === 'today' ? today : addDays(today, 1),
          reason: v.reason,
        },
      }),
  });
}

const OPEN: ReadonlySet<TicketItem['status']> = new Set(['open', 'in_progress']);
const RECENT = 5;

export const toTicket = (d: TicketDetail, meId: string): Ticket => {
  const messages = d.messages.map((m) => ({
    id: m.id,
    from: m.authorId === meId ? ('me' as const) : ('center' as const),
    text: m.text,
    at: new Date(m.createdAt),
  }));
  return { id: d.id, status: messages.at(-1)?.from === 'center' ? 'answered' : 'open', messages };
};

/** MG-09 murojaatlar (FR-RPT-7): oxirgi 5 tasi, xabarlari bilan. */
export function useMyTickets(meId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['guardian', 'tickets'],
    queryFn: async () => {
      const { items } = await api.request<{ items: TicketItem[] }>('/tickets');
      const recent = items.slice(0, RECENT);
      const details = await Promise.all(
        recent.map((i) => api.request<TicketDetail>(`/tickets/${i.id}`)),
      );
      return {
        tickets: details.map((d) => toTicket(d, meId)),
        openId: recent.find((i) => OPEN.has(i.status))?.id,
      };
    },
  });
}

/** Ochiq murojaat bo'lsa — unga xabar, bo'lmasa yangi murojaat (mavzu — matn boshi). */
export function useSendTicket() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ text, openId }: { text: string; openId?: string }) =>
      openId
        ? api.request(`/tickets/${openId}/messages`, { method: 'POST', body: { text } })
        : api.request('/tickets', {
            method: 'POST',
            body: { subject: text.slice(0, 60), message: text },
          }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian', 'tickets'] }),
  });
}
