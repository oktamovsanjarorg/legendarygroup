import { api } from '../../api/client.js';

/** Auth bilan faylni yuklab olish (CSV/Excel eksport). */
export async function download(path: string, fileName: string): Promise<void> {
  const blob = await api.blob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
