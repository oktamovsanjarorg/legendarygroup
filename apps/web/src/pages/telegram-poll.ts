import { useEffect, useRef } from 'react';
import { api } from '../api/client.js';

export const POLL_MS = 2000;

/**
 * Bot tasdig'ini kutish (`/auth/telegram/poll`, ADR 0006 §6): 202 — kutilmoqda, 200 — sessiya.
 * `challengeId` yo'q bo'lsa — hech narsa qilmaydi. Komponent yopilsa — to'xtaydi.
 */
export function useTelegramPoll(
  challengeId: string | undefined,
  onDone: (accessToken: string) => void,
  onError?: (e: unknown) => void,
): void {
  const done = useRef(onDone);
  done.current = onDone;
  const fail = useRef(onError);
  fail.current = onError;
  useEffect(() => {
    if (!challengeId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const r = await api.request<{ accessToken?: string }>('/auth/telegram/poll', {
          method: 'POST',
          body: { challengeId },
        });
        if (stop) return;
        if (r.accessToken) return done.current(r.accessToken);
        timer = setTimeout(() => void tick(), POLL_MS);
      } catch (e) {
        if (!stop) fail.current?.(e);
      }
    };
    // Darhol emas: ikki marta mount'da (StrictMode) bekor bo'lgan so'rov bir martalik natijani yemasin.
    timer = setTimeout(() => void tick(), 0);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [challengeId]);
}
