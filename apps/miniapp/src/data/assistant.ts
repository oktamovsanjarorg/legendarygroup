import type {
  AssistantAction,
  AssistantPrefill,
  AssistantChatResponse,
  AssistantScreen,
  AssistantTurn,
} from '@lg/contracts';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useApi } from './deps.js';

export interface ChatEntry extends AssistantTurn {
  actions?: readonly AssistantAction[];
}

const CHAT_KEY = ['assistant', 'chat'] as const;
/** Modelga ketadigan tarix: oxirgi 20 xabar (contract chegarasi). */
const HISTORY = 20;

/** Ekran → Mini App yo'li (yopiq ro'yxat; model yo'l o'ylab topmaydi). */
const SCREEN_PATH: Record<AssistantScreen, string> = {
  student: '/staff/student/$id',
  pay: '/staff/student/$id/pay',
  newStudent: '/staff/new',
  debtors: '/staff/debtors',
  queue: '/staff/queue',
  approvals: '/staff/approvals',
  attendance: '/staff/attendance',
  leads: '/staff/leads',
  groups: '/staff/groups',
  calendar: '/staff/calendar',
  payments: '/staff/payments',
  cash: '/staff/cash',
  finance: '/staff/finance',
  addExpense: '/staff/expenses/new',
  reports: '/staff/reports',
  announcements: '/staff/announcements',
  tickets: '/staff/tickets',
  newAnnouncement: '/staff/announcements/new',
  linkRequests: '/staff/link-requests',
  discounts: '/staff/discounts',
  courses: '/staff/courses',
  rooms: '/staff/rooms',
  holidays: '/staff/holidays',
  undelivered: '/staff/undelivered',
  payroll: '/staff/payroll',
  forecasts: '/staff/forecasts',
  people: '/staff/people',
  settings: '/staff/settings',
  audit: '/staff/audit',
};

export const actionTarget = (a: AssistantAction): { to: string; params?: { id: string } } =>
  a.studentId
    ? { to: SCREEN_PATH[a.screen], params: { id: a.studentId } }
    : { to: SCREEN_PATH[a.screen] };

const ASK_KEY = ['assistant', 'ask'];

export function useAssistantStatus() {
  const api = useApi();
  return useQuery({
    queryKey: ['assistant', 'status'],
    queryFn: () => api.request<{ enabled: boolean }>('/assistant/status'),
    staleTime: 5 * 60_000,
  });
}

/**
 * Suhbat — so'rov keshida: tab almashsa ham saqlanadi, ilova yopilsa — tozalanadi.
 * Xato bo'lsa savol tarixda qoladi, javob qo'shilmaydi (qayta yuborish mumkin).
 */
export function useAssistantChat() {
  const api = useApi();
  const qc = useQueryClient();
  const chat = useQuery<ChatEntry[]>({
    queryKey: CHAT_KEY,
    queryFn: () => [],
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const entries = chat.data ?? [];
  const set = (next: ChatEntry[]) => qc.setQueryData(CHAT_KEY, next);
  const ask = useMutation({
    mutationKey: ASK_KEY,
    mutationFn: async (text: string) => {
      const asked = [
        ...(qc.getQueryData<ChatEntry[]>(CHAT_KEY) ?? []),
        { role: 'user' as const, text },
      ];
      set(asked);
      const res = await api.request<AssistantChatResponse>('/assistant/chat', {
        method: 'POST',
        body: { messages: asked.slice(-HISTORY).map(({ role, text: t }) => ({ role, text: t })) },
      });
      set([...asked, { role: 'assistant', text: res.reply, actions: res.actions }]);
    },
  });
  return {
    entries,
    ask: (text: string) => ask.mutate(text),
    // Drawer va buyruqlar oynasi — bitta suhbat: kutish holati ham umumiy.
    pending: useIsMutating({ mutationKey: ASK_KEY }) > 0,
    error: ask.error,
    clear: () => {
      ask.reset();
      set([]);
    },
  };
}

/** Yordamchi to'ldirgan forma qoralamasi (T-175, Q-122): bitta, oxirgi bosilgan tugmaniki. */
const DRAFT_KEY = ['assistant', 'draft'] as const;

interface Draft {
  screen: AssistantScreen;
  studentId?: string;
  prefill: AssistantPrefill;
}

/** Tugma: qoralamani saqlab (yoki eskisini o'chirib) ekranni ochadi. */
export function useRunAction() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (a: AssistantAction) => {
    const draft: Draft | null = a.prefill
      ? { screen: a.screen, ...(a.studentId ? { studentId: a.studentId } : {}), prefill: a.prefill }
      : null;
    qc.setQueryData(DRAFT_KEY, draft);
    void navigate(actionTarget(a));
  };
}

/**
 * Forma ochilganda — shu ekran (va o'quvchi) uchun qoralama bo'lsa, bir marta oladi va o'chiradi:
 * orqaga qaytib qayta ochilsa, forma bo'sh bo'ladi.
 */
export function useAssistantDraft(
  screen: AssistantScreen,
  studentId?: string,
): AssistantPrefill | null {
  const qc = useQueryClient();
  const [draft] = useState(() => {
    const d = qc.getQueryData<Draft | null>(DRAFT_KEY);
    return d && d.screen === screen && d.studentId === studentId ? d.prefill : null;
  });
  useEffect(() => {
    if (draft) qc.setQueryData(DRAFT_KEY, null);
  }, [draft, qc]);
  return draft;
}
