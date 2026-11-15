import type { ImportPreviewResponse, TestDetailResponse, TestItem as ApiTest } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText } from '../../api/errors.js';
import type { NewTest } from '../../screens/f3/w19-test-form.js';
import { download } from '../billing/download.js';
import { confirmBody, fileBase64 } from './map.js';

export function useTestData(groupId: string | null, testId: string | null) {
  const list = useQuery({
    queryKey: ['tests', 'group', groupId],
    queryFn: () => api.request<ApiTest[]>(`/tests?groupId=${groupId}`),
    enabled: groupId !== null,
  });
  const detail = useQuery({
    queryKey: ['tests', 'detail', testId],
    queryFn: () => api.request<TestDetailResponse>(`/tests/${testId}`),
    enabled: testId !== null,
  });
  return { list, detail };
}

type Msg = { text: string; error: boolean } | undefined;

/** Amallar: yaratish, shablon, import (preview → confirm), e'lon qilish. */
export function useTestActions(
  groupId: string | null,
  testId: string | null,
  setMsg: (m: Msg) => void,
) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['tests'] });
  const fail = (e: unknown) => setMsg({ text: errorText(e), error: true });
  const create = useMutation({
    mutationFn: (v: NewTest) =>
      api.request<ApiTest>('/tests', { method: 'POST', body: { ...v, groupId } }),
    onSuccess: refresh,
  });
  const upload = useMutation({
    mutationFn: async (file: File) =>
      api.request<ImportPreviewResponse>(`/tests/${testId}/import-preview`, {
        method: 'POST',
        body: { fileBase64: await fileBase64(file) },
      }),
    onSuccess: setPreview,
    onError: fail,
  });
  const confirm = useMutation({
    mutationFn: (accepted: ReadonlySet<string>) =>
      api.request(`/tests/${testId}/import-confirm`, {
        method: 'POST',
        body: confirmBody(preview ?? { matched: [], suggested: [], unmatched: [] }, accepted),
      }),
    onSuccess: () => {
      setPreview(null);
      setMsg({ text: t.tests.import.done, error: false });
      refresh();
    },
    onError: fail,
  });
  const publish = useMutation({
    mutationFn: () => api.request(`/tests/${testId}/publish`, { method: 'POST', body: {} }),
    onSuccess: () => {
      setMsg({ text: t.tests.published, error: false });
      refresh();
    },
    onError: fail,
  });
  const template = () =>
    void download(`/tests/${testId}/template`, `test-${testId}.xlsx`).catch(fail);
  return { create, upload, confirm, publish, template, preview, setPreview };
}
