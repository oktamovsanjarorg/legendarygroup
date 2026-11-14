import { type RoleCode } from '@lg/contracts';
import { auditLogs, closeDb, createDb, type Database, seed } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

type Method = 'GET' | 'POST' | 'PATCH';
const call = (method: Method, url: string, role: RoleCode = 'admin', payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role)!}` },
  });
const codeOf = (res: { json: <T>() => T }) => res.json<{ code: string }>().code;

const ielts = {
  name: 'Ingliz tili (IELTS)',
  levels: ['B1', 'B2', 'C1'],
  defaultMonthlyPrice: '650000',
  lessonDurationMin: 90,
  durationMonths: 9,
};

interface CourseJson {
  id: string;
  name: string;
  levels: string[];
  defaultMonthlyPrice: string;
  gradeScale: string;
  description: string | null;
  archivedAt: string | null;
}

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

describe('Ruxsat: course.manage — har endpoint uchun forbidden (CLAUDE.md)', () => {
  const someId = '00000000-0000-4000-8000-000000000000';
  const endpoints: [Method, string, object?][] = [];
  for (const base of ['courses', 'rooms']) {
    endpoints.push(
      ['GET', base],
      ['GET', `${base}/${someId}`],
      ['POST', base, base === 'courses' ? ielts : { name: '101-xona', capacity: 16 }],
      ['PATCH', `${base}/${someId}`, { name: 'Yangi nom' }],
      ['POST', `${base}/${someId}/archive`],
      ['POST', `${base}/${someId}/restore`],
    );
  }
  it.each(['teacher', 'guardian'] as const)('%s → 403', async (role) => {
    for (const [method, url, body] of endpoints)
      expect((await call(method, url, role, body)).statusCode, `${method} ${url}`).toBe(403);
  });
  it('token yoʻq → 401', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/api/courses' })).statusCode).toBe(401);
  });
  it('Director ham boshqara oladi', async () => {
    expect((await call('GET', 'courses', 'director')).statusCode).toBe(200);
  });
});

describe('Kurslar: CRUD, arxiv, audit (FR-ORG-1)', () => {
  let id = '';

  it('yaratadi: standart qiymatlar, pul string, yagona filial', async () => {
    const res = await call('POST', 'courses', 'admin', ielts);
    expect(res.statusCode).toBe(201);
    const c = res.json<CourseJson>();
    id = c.id;
    expect(c).toMatchObject({
      defaultMonthlyPrice: '650000',
      gradeScale: '0_5',
      description: null,
      levels: ['B1', 'B2', 'C1'],
      archivedAt: null,
    });
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'course.create'), eq(auditLogs.entityId, id)));
    expect(log?.actorRole).toBe('admin');
  });

  it('nom band (katta-kichik harf farqsiz) → COURSE_NAME_TAKEN', async () => {
    const res = await call('POST', 'courses', 'admin', { ...ielts, name: 'ingliz TILI (ielts)' });
    expect(res.statusCode).toBe(409);
    expect(codeOf(res)).toBe('COURSE_NAME_TAKEN');
  });

  it.each([
    ['manfiy narx', { ...ielts, name: 'X kurs', defaultMonthlyPrice: '-1' }],
    ['kasr narx', { ...ielts, name: 'X kurs', defaultMonthlyPrice: '1.5' }],
    ['qisqa dars', { ...ielts, name: 'X kurs', lessonDurationMin: 5 }],
    ['takroriy daraja', { ...ielts, name: 'X kurs', levels: ['B1', 'b1'] }],
    ['notoʻgʻri shkala', { ...ielts, name: 'X kurs', gradeScale: '0_10' }],
  ])('validatsiya: %s → 400', async (_name, body) => {
    expect((await call('POST', 'courses', 'admin', body)).statusCode).toBe(400);
  });

  it('PATCH: faqat yuborilgan maydon oʻzgaradi; audit — faqat farq', async () => {
    const res = await call('PATCH', `courses/${id}`, 'admin', { defaultMonthlyPrice: 700000 });
    expect(res.statusCode).toBe(200);
    expect(res.json<CourseJson>()).toMatchObject({
      defaultMonthlyPrice: '700000',
      levels: ['B1', 'B2', 'C1'],
      gradeScale: '0_5',
    });
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'course.update'), eq(auditLogs.entityId, id)));
    expect(log?.before).toEqual({ defaultMonthlyPrice: '650000' });
    expect(log?.after).toEqual({ defaultMonthlyPrice: '700000' });
  });

  it('boʻsh PATCH → 400; yoʻq kurs → 404', async () => {
    expect((await call('PATCH', `courses/${id}`, 'admin', {})).statusCode).toBe(400);
    const missing = await call('GET', 'courses/00000000-0000-4000-8000-000000000000');
    expect(missing.statusCode).toBe(404);
  });

  it('arxivlash: roʻyxatdan chiqadi, tahrir taqiq, takror — 409', async () => {
    expect((await call('POST', `courses/${id}/archive`)).statusCode).toBe(200);
    const active = (await call('GET', 'courses')).json<CourseJson[]>();
    expect(active.some((c) => c.id === id)).toBe(false);
    const archived = (await call('GET', 'courses?status=archived')).json<CourseJson[]>();
    expect(archived.find((c) => c.id === id)?.archivedAt).not.toBeNull();
    expect(codeOf(await call('PATCH', `courses/${id}`, 'admin', { name: 'Boshqa' }))).toBe(
      'ARCHIVED_READ_ONLY',
    );
    expect(codeOf(await call('POST', `courses/${id}/archive`))).toBe('ALREADY_ARCHIVED');
  });

  it('arxivdagi nom qayta ishlatiladi; arxivdan chiqarishda nom band → 409', async () => {
    expect((await call('POST', 'courses', 'admin', ielts)).statusCode).toBe(201);
    expect(codeOf(await call('POST', `courses/${id}/restore`))).toBe('COURSE_NAME_TAKEN');
  });

  it('parallel bir xil nom — faqat bittasi yaratiladi', async () => {
    const body = { ...ielts, name: 'Matematika' };
    const results = await Promise.all([1, 2, 3].map(() => call('POST', 'courses', 'admin', body)));
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
  });
});

describe('Xonalar: CRUD, arxiv (FR-ORG-2)', () => {
  it('yaratish → tahrir → arxiv → chiqarish; audit amallari', async () => {
    const created = await call('POST', 'rooms', 'admin', { name: '204-xona', capacity: 20 });
    expect(created.statusCode).toBe(201);
    const { id } = created.json<{ id: string }>();
    const upd = await call('PATCH', `rooms/${id}`, 'admin', { capacity: 18 });
    expect(upd.json<{ capacity: number }>().capacity).toBe(18);
    expect((await call('POST', `rooms/${id}/archive`)).statusCode).toBe(200);
    expect(codeOf(await call('POST', `rooms/${id}/restore`))).toBeUndefined();
    expect(codeOf(await call('POST', `rooms/${id}/restore`))).toBe('NOT_ARCHIVED');
    const actions = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.entityId, id));
    expect(actions.map((a) => a.action).sort()).toEqual([
      'room.archive',
      'room.create',
      'room.restore',
      'room.update',
    ]);
  });

  it('sigʻim chegarasi va nom band', async () => {
    expect((await call('POST', 'rooms', 'admin', { name: 'Z', capacity: 10 })).statusCode).toBe(
      400,
    );
    expect(
      (await call('POST', 'rooms', 'admin', { name: '305-xona', capacity: 0 })).statusCode,
    ).toBe(400);
    const res = await call('POST', 'rooms', 'admin', { name: '204-XONA', capacity: 12 });
    expect(codeOf(res)).toBe('ROOM_NAME_TAKEN');
  });
});
