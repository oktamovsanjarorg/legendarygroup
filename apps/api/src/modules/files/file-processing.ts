import { createHash } from 'node:crypto';
import { FILE_PURPOSES, type FilePurpose, IMAGE_MIMES } from '@lg/contracts';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export type ProcessError = 'FILE_TYPE_NOT_ALLOWED' | 'FILE_TOO_LARGE' | 'FILE_CONTENT_MISMATCH';

export interface ProcessedFile {
  body: Buffer;
  mime: string;
  ext: string;
  sha256: string;
}

const isImage = (mime: string): boolean => (IMAGE_MIMES as readonly string[]).includes(mime);

/**
 * Fayl tekshiruvi (07 §3): hajm, **haqiqiy** tur (magic bytes — kengaytma/so'rovga ishonilmaydi),
 * maqsad bo'yicha ruxsat etilgan turlar. Rasm qayta kodlanadi: EXIF/GPS va boshqa metadata
 * olib tashlanadi, yo'nalish (orientation) piksellarga qo'llanadi, ichiga yashirilgan ma'lumot tozalanadi.
 * `declaredMime` berilsa — haqiqiy tur unga mos bo'lishi shart.
 */
export async function processUpload(
  input: Buffer,
  purpose: FilePurpose,
  declaredMime?: string,
): Promise<{ ok: true; file: ProcessedFile } | { ok: false; error: ProcessError }> {
  const rule = FILE_PURPOSES[purpose];
  if (input.length === 0 || input.length > rule.maxBytes)
    return { ok: false, error: 'FILE_TOO_LARGE' };

  const detected = await fileTypeFromBuffer(input);
  if (!detected || !(rule.mimes as readonly string[]).includes(detected.mime)) {
    return { ok: false, error: 'FILE_TYPE_NOT_ALLOWED' };
  }
  if (declaredMime && declaredMime !== detected.mime)
    return { ok: false, error: 'FILE_CONTENT_MISMATCH' };

  let body = input;
  if (isImage(detected.mime)) {
    try {
      const image = sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 }).rotate();
      body = await (
        detected.mime === 'image/png'
          ? image.png()
          : detected.mime === 'image/webp'
            ? image.webp({ quality: 90 })
            : image.jpeg({ quality: 90, mozjpeg: true })
      ).toBuffer();
    } catch {
      return { ok: false, error: 'FILE_CONTENT_MISMATCH' }; // buzilgan yoki soxta rasm
    }
  }
  return {
    ok: true,
    file: {
      body,
      mime: detected.mime,
      ext: detected.ext,
      sha256: createHash('sha256').update(body).digest('hex'),
    },
  };
}
