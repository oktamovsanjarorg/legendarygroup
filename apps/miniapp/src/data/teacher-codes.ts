import type { SaveTeacherCodesRequest, TeacherCodesResult } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

const key = (groupId: string) => ['teacher-codes', groupId] as const;

/** MT-05a: guruh oʻquvchilari, ustoz kodlari va taklif (T-128). */
export function useTeacherCodes(groupId: string) {
  const api = useApi();
  return useQuery({
    queryKey: key(groupId),
    queryFn: () => api.request<TeacherCodesResult>(`/teacher-codes?groupId=${groupId}`),
    enabled: Boolean(groupId),
  });
}

/** MT-05a: kodlarni saqlash; javob — yangilangan roʻyxat (keshga yoziladi). */
export function useSaveTeacherCodes(groupId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: SaveTeacherCodesRequest['items']) =>
      api.request<TeacherCodesResult>('/teacher-codes', {
        method: 'PUT',
        body: { groupId, items },
      }),
    onSuccess: (data) => qc.setQueryData(key(groupId), data),
  });
}
