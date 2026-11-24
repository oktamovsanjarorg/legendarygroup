import { useWebApp } from '@lg/ui-tg';
import { useMutation } from '@tanstack/react-query';
import { useApi } from './deps.js';

/** Faylni ochish: 5 daqiqalik imzolangan havola (Telegram ichki ko'ruvchisi/brauzeri). */
export function useOpenFile() {
  const api = useApi();
  const wa = useWebApp();
  return useMutation({
    mutationFn: (fileId: string) => api.request<{ url: string }>(`/files/${fileId}/url`),
    onSuccess: (r) => wa.openLink(r.url),
  });
}
