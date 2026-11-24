import { type FilePurpose, IMAGE_MIMES, PDF_MIME } from '@lg/contracts';
import { errorText } from '@lg/ui-core';
import type { FilePickState } from '@lg/ui-tg';
import { useRef, useState } from 'react';
import { useApi } from '../data/deps.js';
import { uploadFile } from '../data/upload.js';

/** Rasm/PDF: yashirin `<input type=file>` → S3'ga yuklash (progress) → fayl ID. */
export function useFilePicker(purpose: FilePurpose, initial: FilePickState = { kind: 'empty' }) {
  const api = useApi();
  const ref = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FilePickState>(initial);
  const [fileId, setFileId] = useState<string | null>(null);
  const onFile = async (f: File) => {
    setFileId(null);
    setState({ kind: 'uploading', name: f.name, percent: 0 });
    try {
      const info = await uploadFile(api, purpose, f, (percent) =>
        setState({ kind: 'uploading', name: f.name, percent }),
      );
      setFileId(info.id);
      const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
      setState({ kind: 'ready', name: f.name, previewUrl });
    } catch (e) {
      setState({ kind: 'error', message: errorText(e) });
    }
  };
  const input = (
    <input
      ref={ref}
      type="file"
      hidden
      accept={[...IMAGE_MIMES, PDF_MIME].join(',')}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void onFile(f);
      }}
    />
  );
  return { state, fileId, input, open: () => ref.current?.click() };
}
