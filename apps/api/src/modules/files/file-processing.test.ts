import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processUpload } from './file-processing.js';

const jpegWithExif = () =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: '#336699' } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: 'SECRET-GPS-LOCATION' } } })
    .toBuffer();

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

describe('processUpload (T-019, 07 §3)', () => {
  it('rasm qayta kodlanadi — EXIF olib tashlanadi, sha256 hisoblanadi', async () => {
    const input = await jpegWithExif();
    expect(input.toString('latin1')).toContain('SECRET-GPS-LOCATION');
    const r = await processUpload(input, 'payment_receipt', 'image/jpeg');
    if (!r.ok) throw new Error(r.error);
    expect(r.file.mime).toBe('image/jpeg');
    expect(r.file.body.toString('latin1')).not.toContain('SECRET-GPS-LOCATION');
    expect((await sharp(r.file.body).metadata()).exif).toBeUndefined();
    expect(r.file.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("PDF — o'zgarmasdan qabul qilinadi", async () => {
    const r = await processUpload(PDF, 'payment_receipt');
    expect(r.ok && r.file.mime).toBe('application/pdf');
  });

  it("noto'g'ri tur (maqsadga ruxsat etilmagan) — FILE_TYPE_NOT_ALLOWED", async () => {
    expect(await processUpload(PDF, 'student_photo')).toEqual({
      ok: false,
      error: 'FILE_TYPE_NOT_ALLOWED',
    });
    expect(
      await processUpload(Buffer.from('<html><script>alert(1)</script>'), 'payment_receipt'),
    ).toEqual({
      ok: false,
      error: 'FILE_TYPE_NOT_ALLOWED',
    });
  });

  it('soxta kengaytma/tur: PDF "image/jpeg" deb yuborilsa — FILE_CONTENT_MISMATCH', async () => {
    expect(await processUpload(PDF, 'payment_receipt', 'image/jpeg')).toEqual({
      ok: false,
      error: 'FILE_CONTENT_MISMATCH',
    });
  });

  it("juda katta yoki bo'sh — FILE_TOO_LARGE", async () => {
    expect(await processUpload(Buffer.alloc(0), 'payment_receipt')).toEqual({
      ok: false,
      error: 'FILE_TOO_LARGE',
    });
    const big = Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]);
    expect(await processUpload(big, 'payment_receipt')).toEqual({
      ok: false,
      error: 'FILE_TOO_LARGE',
    });
  });

  it('JPEG sarlavhali buzilgan fayl — FILE_CONTENT_MISMATCH', async () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
    expect((await processUpload(broken, 'payment_receipt')).ok).toBe(false);
  });
});
