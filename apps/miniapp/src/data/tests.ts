import type {
  CreateTestRequest,
  ExcelImportConfirmRequest,
  ImportPreviewResponse,
  TestDetailResponse,
  TestItem,
  TestListItem,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { toGroupTests } from './tests-map.js';

export const TESTS_KEY = ['tests'] as const;

/** MT-07: Guruh testlari ro'yxati (FR-GRD-3). */
export function useGroupTests(groupId: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...TESTS_KEY, 'group', groupId],
    queryFn: async () => {
      const items = await api.request<TestListItem[]>(`/tests?groupId=${groupId}`);
      return toGroupTests(items);
    },
    enabled: Boolean(groupId),
  });
}

/** MT-08: Test detallari va kiritilgan natijalar. */
export function useTestDetail(testId: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...TESTS_KEY, 'detail', testId],
    queryFn: () => api.request<TestDetailResponse>(`/tests/${testId}`),
    enabled: Boolean(testId),
  });
}

/** MT-07: Yangi test yaratish (asosiy ustoz, Q-62). */
export function useCreateTest(groupId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateTestRequest, 'groupId'>) =>
      api.request<TestItem>('/tests', {
        method: 'POST',
        body: { ...body, groupId },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...TESTS_KEY, 'group', groupId] });
    },
  });
}

/** MT-08: Excel natijalarini serverda tahlil qilish (oldindan ko'rish). */
export function useImportPreview(testId: string) {
  const api = useApi();
  return useMutation({
    mutationFn: (fileBase64: string) =>
      api.request<ImportPreviewResponse>(`/tests/${testId}/import-preview`, {
        method: 'POST',
        body: { fileBase64 },
      }),
  });
}

/** MT-08: Excel natijalarini tasdiqlash va saqlash (atomar, BR-35). */
export function useImportConfirm(testId: string, groupId?: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExcelImportConfirmRequest) =>
      api.request<{ success: true }>(`/tests/${testId}/import-confirm`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...TESTS_KEY, 'detail', testId] });
      if (groupId) {
        void qc.invalidateQueries({ queryKey: [...TESTS_KEY, 'group', groupId] });
      }
    },
  });
}

/** MT-08: Test natijalarini e'lon qilish (ota-onaga xabar boradi, BR-35). */
export function usePublishTest(testId: string, groupId?: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.request<TestItem>(`/tests/${testId}/publish`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...TESTS_KEY, 'detail', testId] });
      if (groupId) {
        void qc.invalidateQueries({ queryKey: [...TESTS_KEY, 'group', groupId] });
      }
    },
  });
}

/** MT-08: Excel namuna shablon — bot chatiga (ADR 0008 §5; WebView'da yuklab olish ishonchsiz). */
export function useSendTemplate() {
  const api = useApi();
  return useMutation({
    mutationFn: (testId: string) =>
      api.request<{ status: 'queued' }>(`/tests/${testId}/template/send`, {
        method: 'POST',
        body: {},
      }),
  });
}
