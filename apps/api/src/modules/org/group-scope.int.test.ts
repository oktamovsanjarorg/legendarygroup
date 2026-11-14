import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

/**
 * Ustoz scope matritsasi (02 §3, Q-64, T-103): o'z / begona / ketgan / hali boshlanmagan guruh.
 */
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let teacher = '';
let teacherToken = '';
const g = { own: '', foreign: '', left: '', future: '', assistant: '' };
const today = formatDateToYmd(new Date());

const get = (url: string, token: string) =>
  t.app.inject({
    method: 'GET',
    url: `/api/${url}`,
    headers: { authorization: `Bearer ${token}` },
  });
const admin = (method: 'POST', url: string, payload: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get('admin')!}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  teacher = await createUserWithRole(db, 'teacher');
  teacherToken = await tokenFor(t, db, teacher, 'teacher');
  const other = await createUserWithRole(db, 'teacher');
  const course = (
    await admin('POST', 'courses', {
      name: 'Matematika',
      defaultMonthlyPrice: '550000',
      lessonDurationMin: 90,
    })
  ).json<{ id: string }>().id;
  const mk = async (name: string, teachers: object[], startDate = addDays(today, -60)) =>
    (
      await admin('POST', 'groups', {
        courseId: course,
        name,
        maxStudents: 10,
        startDate,
        teachers,
      })
    ).json<{ id: string; teachers: { id: string }[] }>();
  g.own = (await mk('Oʻz guruh', [{ teacherId: teacher, role: 'main' }])).id;
  g.assistant = (
    await mk('Yordamchi', [
      { teacherId: other, role: 'main' },
      { teacherId: teacher, role: 'assistant' },
    ])
  ).id;
  g.foreign = (await mk('Begona', [{ teacherId: other, role: 'main' }])).id;
  const left = await mk('Ketilgan', [{ teacherId: teacher, role: 'main' }]);
  g.left = left.id;
  await admin('POST', `groups/${left.id}/teachers/${left.teachers[0]!.id}/end`, {
    to: addDays(today, -1),
  });
  g.future = (await mk('Kelajak', [{ teacherId: teacher, role: 'main' }], addDays(today, 7))).id;
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

const listIds = async (token: string) =>
  (await get('groups?status=all', token))
    .json<{ id: string }[]>()
    .map((x) => x.id)
    .sort();

describe('Guruh scope matritsasi', () => {
  it('Director/Admin — hammasi', async () => {
    for (const role of ['director', 'admin'] as const)
      expect(await listIds(tokens.get(role)!)).toHaveLength(5);
  });

  it('Ustoz — bugun amaldagi guruhlari (asosiy va yordamchi)', async () => {
    expect(await listIds(teacherToken)).toEqual([g.own, g.assistant].sort());
    expect((await get(`groups/${g.own}`, teacherToken)).statusCode).toBe(200);
  });

  it.each([
    ['begona', 'foreign'],
    ['ketilgan (Q-64)', 'left'],
    ['hali boshlanmagan', 'future'],
  ] as const)('%s guruh — 404', async (_n, key) => {
    expect((await get(`groups/${g[key]}`, teacherToken)).statusCode).toBe(404);
  });

  it('biriktirilmagan ustoz — boʻsh roʻyxat', async () => {
    expect(await listIds(tokens.get('teacher')!)).toEqual([]);
  });

  it('teacherId filtri (admin)', async () => {
    const res = await get(`groups?teacherId=${teacher}`, tokens.get('admin')!);
    expect(
      res
        .json<{ id: string }[]>()
        .map((x) => x.id)
        .sort(),
    ).toEqual([g.own, g.assistant].sort());
  });
});
