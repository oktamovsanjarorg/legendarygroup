import type {
  AssistantAction,
  AssistantChatResponse,
  AssistantScreen,
  AssistantTurn,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
};

export const actionTarget = (a: AssistantAction): { to: string; params?: { id: string } } =>
  a.studentId
    ? { to: SCREEN_PATH[a.screen], params: { id: a.studentId } }
    : { to: SCREEN_PATH[a.screen] };

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
    pending: ask.isPending,
    error: ask.error,
    clear: () => {
      ask.reset();
      set([]);
    },
  };
}
