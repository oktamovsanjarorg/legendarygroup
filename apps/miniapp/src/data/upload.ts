import type { FileInfo, FilePurpose } from '@lg/contracts';
import type { ApiClient } from '@lg/ui-core';

interface UploadTicket {
  uploadId: string;
  url: string;
  fields: Record<string, string>;
}

/** S3'ga to'g'ridan-to'g'ri (presigned POST): progress uchun XHR (fetch progress bermaydi). */
function postToStorage(
  t: UploadTicket,
  file: File,
  onProgress: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', t.url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('upload network'));
    const form = new FormData();
    for (const [k, v] of Object.entries(t.fields)) form.append(k, v);
    form.append('file', file);
    xhr.send(form);
  });
}

/**
 * Fayl yuklash (FR-SYS-2): ruxsat + presigned POST → S3 → `complete` (server turini va
 * hajmini tekshiradi, EXIF'ni olib tashlaydi). Natija — fayl ID'si.
 */
export async function uploadFile(
  api: ApiClient,
  purpose: FilePurpose,
  file: File,
  onProgress: (percent: number) => void,
): Promise<FileInfo> {
  const ticket = await api.request<UploadTicket>('/files/uploads', {
    method: 'POST',
    body: { purpose, mime: file.type, size: file.size },
  });
  await postToStorage(ticket, file, onProgress);
  return api.request<FileInfo>(`/files/uploads/${ticket.uploadId}/complete`, { method: 'POST' });
}
