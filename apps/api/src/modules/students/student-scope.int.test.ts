import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, guardians, seed } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

/**
 * Scope matritsasi (02 §3, T-105): rol × o'z/begona o'quvchi. Ota-ona — faqat
 * `student_guardians` orqali; arxivdagi farzand ko'rinadi; uzilsa — darhol yopiladi.
 * Ustoz — guruhga biriktirilmagan bo'lsa hech kim (to'liq matritsa — enrollments.int.test).
 */
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let parent = '';
let own = '';
let foreign = '';
let ownGuardianId = '';

const get = (url: string, token: string) =>
  t.app.inject({
    method: 'GET',
    url: `/api/${url}`,
    headers: { authorization: `Bearer ${token}` },
  });
const admin = (method: 'POST' | 'DELETE', url: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get('admin')!}` },
  });

interface Detail {
  guardians: { guardianId: string; phone: string | null }[];
  notes: string | null;
  source: string | null;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const mk = async (fullName: string, phones: string[]) =>
    (
      await admin('POST', 'students', {
        fullName,
        notes: 'Ichki',
        source: 'telegram',
        guardians: phones.map((phone, i) => ({
          fullName: `Ota-ona ${phone.slice(-3)}`,
          phone,
          relation: i === 0 ? 'mother' : 'father',
        })),
      })
    ).json<{ id: string; guardians: { guardianId: string }[] }>();
  const a = await mk('Oʻz Farzand', ['+998935550001', '+998935550002']);
  const b = await mk('Begona Bola', ['+998935550009']);
  own = a.id;
  foreign = b.id;
  ownGuardianId = a.guardians[0]!.guardianId;
  // Bot orqali bog'lanish (T-110) simulyatsiyasi: guardians.user_id to'ldiriladi.
  const userId = await createUserWithRole(db, 'guardian', '+998935550001');
  await db.update(guardians).set({ userId }).where(eq(guardians.id, ownGuardianId));
  parent = await tokenFor(t, db, userId, 'guardian');
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

const ids = async (token: string) =>
  (await get('students?limit=100', token))
    .json<{ items: { id: string }[] }>()
    .items.map((i) => i.id);

describe('Scope matritsasi: rol × oʻz/begona oʻquvchi', () => {
  it.each(['director', 'admin'] as const)('%s — hammasi', async (role) => {
    const token = tokens.get(role)!;
    expect(await ids(token)).toEqual(expect.arrayContaining([own, foreign]));
    expect((await get(`students/${foreign}`, token)).statusCode).toBe(200);
  });

  it('ota-ona — faqat oʻz farzandi; begona — 404 (mavjudligi oshkor qilinmaydi)', async () => {
    expect(await ids(parent)).toEqual([own]);
    expect((await get(`students/${own}`, parent)).statusCode).toBe(200);
    expect((await get(`students/${foreign}`, parent)).statusCode).toBe(404);
    expect((await get(`students/${foreign}/photo`, parent)).statusCode).toBe(404);
  });

  it('bogʻlanmagan ota-ona roli (guardians.user_id yoʻq) — hech kim', async () => {
    expect(await ids(tokens.get('guardian')!)).toEqual([]);
  });

  it('biriktirilmagan ustoz — hech kim (deny by default)', async () => {
    const teacher = tokens.get('teacher')!;
    expect(await ids(teacher)).toEqual([]);
    expect((await get(`students/${own}`, teacher)).statusCode).toBe(404);
  });
});

describe('Field-level (02 §3)', () => {
  it('ota-ona: oʻz telefoni koʻrinadi, ikkinchi ota-onaniki — yoʻq; ichki maydonlar — null', async () => {
    const d = (await get(`students/${own}`, parent)).json<Detail>();
    const phones = Object.fromEntries(d.guardians.map((g) => [g.guardianId, g.phone]));
    expect(phones[ownGuardianId]).toBe('+998935550001');
    expect(Object.values(phones).filter((p) => p === null)).toHaveLength(1);
    expect([d.notes, d.source]).toEqual([null, null]);
  });

  it('admin: hamma telefon va ichki maydonlar', async () => {
    const d = (await get(`students/${own}`, tokens.get('admin')!)).json<Detail>();
    expect(d.guardians.every((g) => g.phone !== null)).toBe(true);
    expect([d.notes, d.source]).toEqual(['Ichki', 'telegram']);
  });
});

describe('Arxiv va uzilish', () => {
  it('arxivdagi farzand ota-onaga koʻrinadi (tarix/qarz)', async () => {
    expect((await admin('POST', `students/${own}/archive`)).statusCode).toBe(200);
    expect((await get(`students/${own}`, parent)).statusCode).toBe(200);
    expect(await ids(parent)).toEqual([]); // standart filtr — faollar
    const all = await get('students?status=all', parent);
    expect(all.json<{ items: { id: string }[] }>().items.map((i) => i.id)).toEqual([own]);
    expect((await admin('POST', `students/${own}/restore`)).statusCode).toBe(200);
  });

  it('bogʻlanish uzilsa — kirish darhol yopiladi; asosiy boshqa ota-onaga oʻtadi', async () => {
    const res = await admin('DELETE', `students/${own}/guardians/${ownGuardianId}`);
    expect(res.statusCode).toBe(200);
    const rest = res.json<{ isPrimary: boolean }[]>();
    expect(rest).toHaveLength(1);
    expect(rest[0]?.isPrimary).toBe(true);
    expect((await get(`students/${own}`, parent)).statusCode).toBe(404);
  });
});
