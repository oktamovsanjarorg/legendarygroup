import { randomBytes } from 'node:crypto';
import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, files, seed } from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let guardianId = '';
let guardianToken = '';

const fileOf = async (purpose: string, uploadedBy: string) => {
  const sha = randomBytes(32).toString('hex');
  const [f] = await db
    .insert(files)
    .values({
      s3Key: `x/${sha}.png`,
      mime: 'image/png',
      size: 100,
      sha256: sha,
      purpose,
      uploadedBy,
    })
    .returning();
  if (!f) throw new Error('fayl yaratilmadi');
  return f.id;
};
const send = (token: string, payload: object) =>
  t.app.inject({
    method: 'POST',
    url: '/api/feedback',
    headers: { authorization: `Bearer ${token}` },
    payload: { text: 'Tugma ishlamadi, qayta urinib koʻrdim', platform: 'miniapp', ...payload },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  guardianId = await createUserWithRole(db, 'guardian', '+998905550101');
  guardianToken = await tokenFor(t, db, guardianId, 'guardian');
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-118 fikr-mulohaza skrinshoti (FR-SYS-4)', () => {
  it('har qanday rol skrinshot yuklashni boshlay oladi (feedback_screenshot)', async () => {
    for (const token of [guardianToken, tokens.get('teacher') ?? '']) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/files/uploads',
        headers: { authorization: `Bearer ${token}` },
        payload: { purpose: 'feedback_screenshot', mime: 'image/png', size: 1000 },
      });
      expect(res.statusCode).toBe(200);
    }
  });

  it('oʻz skrinshoti — qabul qilinadi', async () => {
    const fileId = await fileOf('feedback_screenshot', guardianId);
    expect((await send(guardianToken, { fileId })).statusCode).toBe(201);
  });

  it('boshqaning fayli yoki boshqa maqsaddagi fayl — 422', async () => {
    const adminFile = await fileOf('feedback_screenshot', guardianId);
    const res = await send(tokens.get('admin') ?? '', { fileId: adminFile });
    expect(res.statusCode).toBe(422);
    expect(res.json<{ code: string }>().code).toBe('FILE_NOT_ALLOWED');

    const receipt = await fileOf('payment_receipt', guardianId);
    expect((await send(guardianToken, { fileId: receipt })).statusCode).toBe(422);
  });
});
