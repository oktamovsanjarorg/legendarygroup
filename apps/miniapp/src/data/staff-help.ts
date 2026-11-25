import type { SessionInfo } from '@lg/contracts';
import { miniappMessages as t, normalizeUz } from '@lg/i18n';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';

const { sections } = t.staffHelp;
export type HelpSectionView = (typeof sections)[number];

/** Ruxsatga qarab bo'limlar va qidiruv (ikki yozuv bir xil — CLAUDE.md "Qidiruv"). */
export function helpFor(permissions: readonly string[], query: string): HelpSectionView[] {
  const may = (p?: string) => p === undefined || permissions.includes(p);
  const q = normalizeUz(query.trim());
  return sections
    .filter((s) => may(s.permission))
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => may(i.permission) && normalizeUz([i.q, ...i.steps, i.note].join(' ')).includes(q),
      ),
    }))
    .filter((s) => s.items.length > 0);
}

/** FR-AUTH-7: brauzerdagi sessiyalar (Mini App'da sessiya yo'q — Telegram imzosi). */
export function useSessions() {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'sessions'],
    queryFn: () => api.request<SessionInfo[]>('/auth/sessions'),
  });
}
