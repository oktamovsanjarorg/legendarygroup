import type { FileInfo, FilePurpose } from '@lg/contracts';
import { api } from '../api/client.js';

interface UploadTicket {
  uploadId: string;
  url: string;
  fields: Record<string, string>;
}

/**
 * Fayl yuklash (FR-SYS-2): ruxsat → presigned POST bilan S3'ga to'g'ridan-to'g'ri → `complete`
 * (server turini/hajmini tekshiradi). Natija — fayl ID'si (Mini App'dagi oqim bilan bir xil).
 */
export async function uploadFile(purpose: FilePurpose, file: File): Promise<FileInfo> {
  const ticket = await api.request<UploadTicket>('/files/uploads', {
    method: 'POST',
    body: { purpose, mime: file.type, size: file.size },
  });
  const form = new FormData();
  for (const [k, v] of Object.entries(ticket.fields)) form.append(k, v);
  form.append('file', file);
  const res = await fetch(ticket.url, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  return api.request<FileInfo>(`/files/uploads/${ticket.uploadId}/complete`, { method: 'POST' });
}
