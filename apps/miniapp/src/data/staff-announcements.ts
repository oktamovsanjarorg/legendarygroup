import type {
  AnnouncementItem,
  AnnouncementPreviewResponse,
  AnnouncementStats,
  AnnouncementTargetType,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'announcements'] as const;

export interface AnnForm {
  targetType: AnnouncementTargetType;
  targetId: string | null;
  title: string;
  body: string;
}
export const emptyAnn: AnnForm = { targetType: 'group', targetId: null, title: '', body: '' };

export const needsTarget = (type: AnnouncementTargetType) => type === 'group' || type === 'course';
/** Auditoriya aniq (guruh/kurs tanlangan). */
export const annTargetReady = (f: AnnForm) => !needsTarget(f.targetType) || f.targetId !== null;
/** Server chegaralari (contracts): sarlavha ≥ 3, matn ≥ 5 belgi. */
export const annReady = (f: AnnForm, count: number) =>
  annTargetReady(f) && count > 0 && f.title.trim().length >= 3 && f.body.trim().length >= 5;

export function useAnnouncements() {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'list'],
    queryFn: async () =>
      (await api.request<{ items: AnnouncementItem[] }>('/announcements?limit=50')).items,
  });
}

export function useAnnouncementStats(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'stats', id],
    queryFn: () => api.request<AnnouncementStats>(`/announcements/${id}/stats`),
  });
}

export function useAudience(f: AnnForm) {
  const api = useApi();
  const target = f.targetId ? `&targetId=${f.targetId}` : '';
  return useQuery({
    queryKey: [...KEY, 'audience', f.targetType, f.targetId],
    queryFn: () =>
      api.request<AnnouncementPreviewResponse>(
        `/announcements/preview?targetType=${f.targetType}${target}`,
      ),
    enabled: annTargetReady(f),
  });
}

export function useSendStaffAnnouncement() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { form: AnnForm; fileId: string | null }) =>
      api.request<AnnouncementItem>('/announcements', {
        method: 'POST',
        body: {
          targetType: a.form.targetType,
          targetId: a.form.targetId,
          title: a.form.title.trim(),
          body: a.form.body.trim(),
          fileId: a.fileId,
        },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
