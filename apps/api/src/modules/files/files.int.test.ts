import type { RoleCode } from '@lg/contracts';
import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  files,
  roles,
  seed,
  userRoles,
  users,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StorageService } from '../../common/storage/storage.service.js';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { SessionsService, TokensService } from '../auth/index.js';

let t: TestApp;
let db: Database;
const tokens = new Map<RoleCode, string>();
const ids = new Map<RoleCode, string>();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

const api = (method: 'GET' | 'POST', url: string, role: RoleCode, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role)!}` },
  });

/** Brauzer kabi: presigned POST'ga multipart yuklash. */
async function uploadTo(
  target: { url: string; fields: Record<string, string> },
  body: Buffer,
  mime: string,
) {
  const form = new FormData();
  for (const [k, v] of Object.entries(target.fields)) form.append(k, v);
  form.append('file', new Blob([new Uint8Array(body)], { type: mime }), 'file');
  return fetch(target.url, { method: 'POST', body: form });
}

async function startUpload(role: RoleCode, purpose: string, mime: string, size: number) {
  const res = await api('POST', 'files/uploads', role, { purpose, mime, size });
  return {
    res,
    body: res.json<{ uploadId: string; url: string; fields: Record<string, string> }>(),
  };
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  let n = 0;
  for (const role of ['guardian', 'admin', 'teacher'] as RoleCode[]) {
    n += 1;
    const [u] = await db
      .insert(users)
      .values({ fullName: role, phone: `+99894000000${n}` })
      .returning();
    const [r] = await db.select().from(roles).where(eq(roles.code, role));
    await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
    const s = await t.app.get(SessionsService).create(u!.id, role, { ip: null, device: null });
    tokens.set(
      role,
      await t.app.get(TokensService).signAccess({ sub: u!.id, role, sid: s.sessionId, pv: 1 }),
    );
    ids.set(role, u!.id);
  }
});
afterAll(async () => {
  const storage = t.app.get(StorageService);
  for (const f of await db.select().from(files))
    await storage.remove(f.s3Key).catch(() => undefined);
  await closeDb(db);
  await t.close();
});

describe('Fayl yuklash (T-019, FR-SYS-2)', () => {
  it("to'liq oqim: presigned POST → complete → EXIF'siz rasm, ko'rish havolasi", async () => {
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#0a0' } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: 'GPS-SECRET' } } })
      .toBuffer();
    const { res, body } = await startUpload(
      'guardian',
      'payment_receipt',
      'image/jpeg',
      jpeg.length,
    );
    expect(res.statusCode).toBe(200);
    expect((await uploadTo(body, jpeg, 'image/jpeg')).status).toBe(204);

    const done = await api('POST', `files/uploads/${body.uploadId}/complete`, 'guardian');
    expect(done.statusCode).toBe(200);
    const info = done.json<{ id: string; mime: string; sha256: string }>();
    expect(info.mime).toBe('image/jpeg');

    const view = await api('GET', `files/${info.id}/url`, 'guardian');
    const fetched = Buffer.from(
      await (await fetch(view.json<{ url: string }>().url)).arrayBuffer(),
    );
    expect(fetched.toString('latin1')).not.toContain('GPS-SECRET');
    const [row] = await db.select().from(files).where(eq(files.id, info.id));
    expect(row).toMatchObject({
      purpose: 'payment_receipt',
      uploadedBy: ids.get('guardian'),
      sha256: info.sha256,
    });
    expect(row?.s3Key).toMatch(/^files\/\d{4}\/\d{2}\//);
  });

  it("ko'rish: Admin (payment.review) — ha; Ustoz — 404 (mavjudligi oshkor emas)", async () => {
    const [row] = await db.select().from(files).limit(1);
    expect((await api('GET', `files/${row!.id}/url`, 'admin')).statusCode).toBe(200);
    expect((await api('GET', `files/${row!.id}/url`, 'teacher')).statusCode).toBe(404);
  });

  it("ruxsatsiz maqsad — 403; noto'g'ri tur yoki hajm — 422", async () => {
    expect(
      (await startUpload('teacher', 'payment_receipt', 'image/jpeg', 100)).res.statusCode,
    ).toBe(403);
    const wrongType = await startUpload('guardian', 'payment_receipt', 'text/html', 100);
    expect([wrongType.res.statusCode, wrongType.res.json<{ code: string }>().code]).toEqual([
      422,
      'FILE_TYPE_NOT_ALLOWED',
    ]);
    const big = await startUpload('guardian', 'payment_receipt', 'image/jpeg', 11 * 1024 * 1024);
    expect(big.res.json<{ code: string }>().code).toBe('FILE_TOO_LARGE');
  });

  it("S3 o'zi hajm chegarasini majburlaydi (presigned shart)", async () => {
    const { body } = await startUpload('admin', 'student_photo', 'image/jpeg', 1000);
    const res = await uploadTo(body, Buffer.alloc(6 * 1024 * 1024, 1), 'image/jpeg');
    expect(res.status).toBe(400); // EntityTooLarge
  });

  it("soxta tur: 'image/jpeg' deb e'lon qilib PDF yuklansa — 422 FILE_CONTENT_MISMATCH", async () => {
    const { body } = await startUpload('guardian', 'payment_receipt', 'image/jpeg', PDF.length);
    await uploadTo(body, PDF, 'image/jpeg');
    const res = await api('POST', `files/uploads/${body.uploadId}/complete`, 'guardian');
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([
      422,
      'FILE_CONTENT_MISMATCH',
    ]);
  });

  it('yuklashni faqat boshlagan foydalanuvchi va faqat bir marta yakunlaydi', async () => {
    const { body } = await startUpload(
      'guardian',
      'payment_receipt',
      'application/pdf',
      PDF.length,
    );
    await uploadTo(body, PDF, 'application/pdf');
    expect((await api('POST', `files/uploads/${body.uploadId}/complete`, 'admin')).statusCode).toBe(
      404,
    );
    // Begona urinish yuklashni yo'q qildi — egasi ham endi qayta tanlaydi (xavfsiz tomonga).
    expect(
      (await api('POST', `files/uploads/${body.uploadId}/complete`, 'guardian')).statusCode,
    ).toBe(404);
  });
});

describe("Bot yo'li: /internal/files (T-019)", () => {
  const post = (body: Buffer, headers: Record<string, string>) =>
    t.app.inject({
      method: 'POST',
      url: '/internal/files',
      payload: body,
      headers: { 'content-type': 'application/octet-stream', ...headers },
    });

  it('xizmat tokeni bilan — qabul; tokensiz — 401; audit yoziladi', async () => {
    const meta = { 'x-file-purpose': 'payment_receipt', 'x-uploaded-by': ids.get('guardian')! };
    expect((await post(PDF, meta)).statusCode).toBe(401);
    const ok = await post(PDF, { ...meta, 'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN });
    expect(ok.statusCode).toBe(200);
    const id = ok.json<{ id: string }>().id;
    const audit = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(audit[0]).toMatchObject({ action: 'file.upload', actorId: ids.get('guardian') });
  });
});
