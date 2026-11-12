import type { RoleCode } from '@lg/contracts';
import { auditLogs, closeDb, createDb, type Database, seed } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
const call = (method: Method, url: string, role: RoleCode = 'admin', payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role)!}` },
  });
const codeOf = (res: { json: <T>() => T }) => res.json<{ code: string }>().code;

interface Detail {
  id: string;
  code: number;
  fullName: string;
  notes: string | null;
  guardians: { guardianId: string; phone: string | null; isPrimary: boolean; linked: boolean }[];
}
interface Page {
  items: { id: string; fullName: string; code: number }[];
  nextCursor: string | null;
}

const ali = {
  fullName: 'Aliyev Sardor',
  birthDate: '2011-03-14',
  gender: 'male',
  phone: '90 111 22 33',
  school: '64-maktab',
  grade: '9',
  source: 'instagram',
  notes: 'Ichki izoh',
  guardians: [
    { fullName: 'Aliyev Bahodir', phone: '+998 90 123 45 67', relation: 'father' },
    { fullName: 'Aliyeva Dilnoza', phone: '909876543', relation: 'mother', notify: false },
  ],
};

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

describe('Ruxsat: har endpoint uchun forbidden (CLAUDE.md)', () => {
  const someId = '00000000-0000-4000-8000-000000000000';
  const manage: [Method, string, object?][] = [
    ['POST', 'students', ali],
    ['PATCH', `students/${someId}`, { school: 'X' }],
    ['POST', `students/${someId}/archive`],
    ['POST', `students/${someId}/restore`],
    ['POST', `students/${someId}/guardians`, ali.guardians[0]],
    ['PATCH', `students/${someId}/guardians/${someId}`, { notify: true }],
    ['DELETE', `students/${someId}/guardians/${someId}`],
    ['GET', 'guardians/lookup?phone=901234567'],
    ['PATCH', `guardians/${someId}`, { fullName: 'Yangi Ism' }],
  ];
  it.each(['teacher', 'guardian'] as const)('%s → yozish/lookup 403', async (role) => {
    for (const [method, url, body] of manage)
      expect((await call(method, url, role, body)).statusCode, `${method} ${url}`).toBe(403);
  });
  it('token yoʻq → 401', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/api/students' })).statusCode).toBe(401);
  });
});

describe('Yaratish: kod, telefon normalizatsiyasi, ota-onalar (FR-STU-1/2)', () => {
  let first: Detail;

  it('kod avtomatik, telefon E.164, birinchi ota-ona — asosiy; audit PII maskalangan', async () => {
    const res = await call('POST', 'students', 'admin', ali);
    expect(res.statusCode).toBe(201);
    first = res.json<Detail>();
    expect(first.code).toBeGreaterThanOrEqual(10001);
    expect(first.guardians.map((g) => [g.phone, g.isPrimary, g.linked])).toEqual([
      ['+998901234567', true, false],
      ['+998909876543', false, false],
    ]);
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'student.create'), eq(auditLogs.entityId, first.id)));
    expect(log?.after).toMatchObject({ phone: '+99890***2233', guardians: 2 });
  });

  it('dublikat (ism + sana, apostrof/registr farqsiz) → 409, allowDuplicate bilan — 201', async () => {
    const dup = { ...ali, fullName: 'ALIYEV  sardor', guardians: [] };
    const res = await call('POST', 'students', 'admin', dup);
    expect(res.statusCode).toBe(409);
    expect(codeOf(res)).toBe('POSSIBLE_DUPLICATE');
    expect(res.json<{ details: { matches: { id: string }[] } }>().details.matches[0]?.id).toBe(
      first.id,
    );
    expect(
      (await call('POST', 'students', 'admin', { ...dup, allowDuplicate: true })).statusCode,
    ).toBe(201);
  });

  it('mavjud ota-ona telefon boʻyicha qayta ishlatiladi (FR-AUTH-6: bir nechta farzand)', async () => {
    const res = await call('POST', 'students', 'admin', {
      fullName: 'Aliyeva Madina',
      guardians: [{ fullName: 'Boshqa ism', phone: '901234567', relation: 'father' }],
    });
    const sister = res.json<Detail>();
    expect(sister.guardians[0]?.guardianId).toBe(first.guardians[0]?.guardianId);
    const lookup = await call('GET', 'guardians/lookup?phone=%2B998901234567');
    const g = lookup.json<{ guardian: { fullName: string; children: unknown[] } }>().guardian;
    expect(g.fullName).toBe('Aliyev Bahodir');
    expect(g.children).toHaveLength(2);
  });

  it.each([
    ['notoʻgʻri telefon', { fullName: 'Test Bola', phone: '12345' }],
    [
      'ikki asosiy',
      {
        fullName: 'Test Bola',
        guardians: [
          { fullName: 'Ota Bir', phone: '901110001', relation: 'father', isPrimary: true },
          { fullName: 'Ona Bir', phone: '901110002', relation: 'mother', isPrimary: true },
        ],
      },
    ],
    [
      'bir telefon ikki marta',
      {
        fullName: 'Test Bola',
        guardians: [
          { fullName: 'Ota Bir', phone: '901110001', relation: 'father' },
          { fullName: 'Ona Bir', phone: '+998901110001', relation: 'mother' },
        ],
      },
    ],
    [
      'yoʻq rasm fayli',
      { fullName: 'Test Bola', photoFileId: '00000000-0000-4000-8000-000000000000' },
    ],
  ])('validatsiya: %s → 400', async (_n, body) => {
    expect((await call('POST', 'students', 'admin', body)).statusCode).toBe(400);
  });
});

describe('Qidiruv va pagination (FR-STU-5)', () => {
  it('ism (apostrof shakli farqsiz), kod (LG- bilan), oʻquvchi va ota-ona telefoni', async () => {
    const created = await call('POST', 'students', 'admin', { fullName: 'Gʻulomova Oʻgʻiloy' });
    const { id, code } = created.json<Detail>();
    const ids = async (q: string) => {
      const res = await call('GET', `students?q=${encodeURIComponent(q)}`);
      expect(res.statusCode, `${q}: ${res.body}`).toBe(200);
      return res.json<Page>().items.map((i) => i.id);
    };
    expect(await ids("g'ulomova o'g'il")).toContain(id);
    expect(await ids(`LG-${code}`)).toEqual([id]);
    expect(await ids('90 111 22 33')).toHaveLength(2); // Sardor va uning dublikati
    expect((await ids('909876543')).length).toBeGreaterThan(0); // onasi telefoni
    expect(await ids('100%')).toEqual([]);
  });

  it('cursor: sahifalar kesishmaydi va hammasini qamraydi', async () => {
    const all = (await call('GET', 'students?limit=100')).json<Page>().items.map((i) => i.id);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const url: string = `students?limit=2${cursor ? `&cursor=${cursor}` : ''}`;
      const page: Page = (await call('GET', url)).json<Page>();
      seen.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual(all);
    expect((await call('GET', 'students?cursor=buzuq')).statusCode).toBe(400);
  });
});

describe('Arxiv (FR-STU-6) va tahrir', () => {
  it('PATCH ismni oʻzgartiradi (qidiruv ham), arxivda tahrir taqiq, roʻyxatdan chiqadi', async () => {
    const { id } = (
      await call('POST', 'students', 'admin', { fullName: 'Karimov Jasur' })
    ).json<Detail>();
    await call('PATCH', `students/${id}`, 'admin', { fullName: 'Karimov Jasurbek' });
    const found = (await call('GET', 'students?q=jasurbek')).json<Page>().items;
    expect(found.map((i) => i.id)).toEqual([id]);
    expect((await call('POST', `students/${id}/archive`)).statusCode).toBe(200);
    expect(codeOf(await call('PATCH', `students/${id}`, 'admin', { grade: '10' }))).toBe(
      'ARCHIVED_READ_ONLY',
    );
    expect((await call('GET', 'students?q=jasurbek')).json<Page>().items).toEqual([]);
    expect(
      (await call('GET', 'students?q=jasurbek&status=archived')).json<Page>().items,
    ).toHaveLength(1);
  });
});
