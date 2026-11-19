import type { RoleCode, StudentDetail, StudentListResult } from '@lg/contracts';
import { auditLogs, closeDb, createDb, type Database, seed } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

const call = (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object, role = 'admin') =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role as RoleCode)!}` },
  });

const create = (payload: object) => call('POST', 'students', payload);

describe('Oʻquvchi raqamini yaratuvchi kiritadi (T-127)', () => {
  it('kiritilgan raqam saqlanadi va qidiruvda topiladi', async () => {
    const res = await create({ fullName: 'Titul Bola', code: 1325 });
    expect(res.statusCode).toBe(201);
    const s = res.json<StudentDetail>();
    expect(s.code).toBe(1325);

    const list = await call('GET', 'students?q=1325');
    expect(list.json<StudentListResult>().items.map((i) => i.id)).toEqual([s.id]);
  });

  it('band raqam → 409 STUDENT_CODE_TAKEN (yaratish va tahrirlash)', async () => {
    const dup = await create({ fullName: 'Ikkinchi Bola', code: 1325 });
    expect(dup.statusCode).toBe(409);
    expect(dup.json<{ code: string }>().code).toBe('STUDENT_CODE_TAKEN');

    const other = (await create({ fullName: 'Uchinchi Bola', code: 1326 })).json<StudentDetail>();
    const patch = await call('PATCH', `students/${other.id}`, { code: 1325 });
    expect(patch.statusCode).toBe(409);
    expect(patch.json<{ code: string }>().code).toBe('STUDENT_CODE_TAKEN');
  });

  it('boʻsh — avtomatik; qoʻlda band qilingan keyingi raqam oʻtkazib yuboriladi', async () => {
    const a = (await create({ fullName: 'Avto Bir' })).json<StudentDetail>();
    expect(a.code).toBeGreaterThanOrEqual(10001);
    expect((await create({ fullName: 'Qoʻlda Band', code: a.code + 1 })).statusCode).toBe(201);
    const b = (await create({ fullName: 'Avto Ikki' })).json<StudentDetail>();
    expect(b.code).toBe(a.code + 2);
  });

  it('raqamni tahrirlash auditga tushadi', async () => {
    const s = (await create({ fullName: 'Tahrir Bola', code: 2001 })).json<StudentDetail>();
    const res = await call('PATCH', `students/${s.id}`, { code: 2002 });
    expect(res.statusCode).toBe(200);
    expect(res.json<StudentDetail>().code).toBe(2002);
    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'student.update'), eq(auditLogs.entityId, s.id)));
    expect(audit?.before).toMatchObject({ code: 2001 });
    expect(audit?.after).toMatchObject({ code: 2002 });
  });

  it('notoʻgʻri raqam (0, 8 xona, kasr) → 400', async () => {
    for (const code of [0, 10_000_000, 12.5]) {
      expect((await create({ fullName: 'Xato Raqam', code })).statusCode).toBe(400);
    }
  });

  it('forbidden: ustoz va ota-ona raqam bilan oʻquvchi yarata olmaydi', async () => {
    for (const role of ['teacher', 'guardian', 'student']) {
      const res = await call('POST', 'students', { fullName: 'Taqiq Bola', code: 3001 }, role);
      expect(res.statusCode).toBe(403);
    }
  });
});
