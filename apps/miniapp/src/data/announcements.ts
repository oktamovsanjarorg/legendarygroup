import type { AnnouncementPreviewResponse, CreateAnnouncementRequest } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

export const ANNOUNCEMENTS_KEY = ['announcements'] as const;

/** MT-10: Guruh ota-onalari auditoriyasi hajmini tekshirish. */
export function useAnnouncementPreview(groupId: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...ANNOUNCEMENTS_KEY, 'preview', 'group', groupId],
    queryFn: () =>
      api.request<AnnouncementPreviewResponse>(
        `/announcements/preview?targetType=group&targetId=${groupId}`,
      ),
    enabled: Boolean(groupId),
  });
}

/** MT-10: Guruhga e'lon yuborish (asosiy ustoz, Q-62, BR-35). */
export function useSendAnnouncement(groupId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateAnnouncementRequest, 'targetType' | 'targetId'>) =>
      api.request('/announcements', {
        method: 'POST',
        body: {
          ...body,
          targetType: 'group',
          targetId: groupId,
          sendNow: true,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY });
    },
  });
}
