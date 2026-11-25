import type {
  BotStudentLinkResult,
  TelegramOnboardResult,
  TelegramOnboardStatus,
} from '@lg/contracts';
import { useWebApp } from '@lg/ui-tg';
import { useApi } from './deps.js';

/** C-03 (Q-111): Mini App ichida bog'lanish — bot oraliq bo'g'in emas. */
export function useOnboard() {
  const api = useApi();
  const { initData } = useWebApp();
  return {
    /** Ochilganda: avval yuborilgan so'rov holati. */
    status: () =>
      api.request<TelegramOnboardStatus>('/auth/telegram/status', {
        method: 'POST',
        body: { initData },
        retry: false,
      }),
    contact: (contact: string, createRequest: boolean) =>
      api.request<TelegramOnboardResult>('/auth/telegram/contact', {
        method: 'POST',
        body: { initData, contact, createRequest },
        retry: false,
      }),
    student: (contact: string, code: string) =>
      api.request<BotStudentLinkResult>('/auth/telegram/student', {
        method: 'POST',
        body: { initData, contact, code },
        retry: false,
      }),
  };
}
