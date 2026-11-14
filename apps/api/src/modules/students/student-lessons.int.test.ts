import type { LessonDto, RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, guardians, seed } from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

/** GET /students/:id/lessons (T-116): ota-ona jadvali — faqat yozilgan kunlari, scope bilan. */
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let parent = '';
const s = { own: '', foreign: '' };
const today = formatDateToYmd(new Date());
// O'tgan sanaga dars qo'yib bo'lmaydi (LESSON_IN_PAST) — kelajakda yoziladi.
const joined = addDays(today, 5);

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });
const admin = (url: string, body: object) => call('POST', url, tokens.get('admin')!, body);
const idOf = async (url: string, body: object) =>
  (await admin(url, body)).json<{ id: string }>().id;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const course = await idOf('courses', {
    name: 'Matem',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 60,
  });
  const group = await idOf('groups', {
    courseId: course,
    name: 'M-1',
    maxStudents: 10,
    startDate: addDays(today, -40),
  });
  const own = (
    await admin('students', {
      fullName: 'Oʻz Farzand',
      guardians: [{ fullName: 'Ona', phone: '+998935551001', relation: 'mother' }],
    })
  ).json<{ id: string; guardians: { guardianId: string }[] }>();
  s.own = own.id;
  s.foreign = await idOf('students', { fullName: 'Begona Bola' });
  await admin('enrollments', { studentId: s.own, groupId: group, startDate: joined });
  await admin('enrollments', { studentId: s.foreign, groupId: group, startDate: joined });
  for (const date of [addDays(joined, -3), addDays(joined, 2)])
    await admin('lessons', { groupId: group, date, startTime: '15:00', endTime: '16:00' });
  const userId = await createUserWithRole(db, 'guardian', '+998935551001');
  await db.update(guardians).set({ userId }).where(eq(guardians.id, own.guardians[0]!.guardianId));
  parent = await tokenFor(t, db, userId, 'guardian');
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

const range = `from=${today}&to=${addDays(today, 30)}`;

describe('GET /students/:id/lessons (T-116)', () => {
  it('ota-ona: faqat farzand guruhga yozilgandan keyingi darslar', async () => {
    const res = await call('GET', `students/${s.own}/lessons?${range}`, parent);
    expect(res.statusCode).toBe(200);
    const dates = res.json<LessonDto[]>().map((l) => l.date);
    expect(dates).toContain(addDays(joined, 2));
    expect(dates).not.toContain(addDays(joined, -3));
  });

  it('begona bola — 404 (mavjudligi oshkor qilinmaydi); noto‘g‘ri oraliq — 400', async () => {
    expect((await call('GET', `students/${s.foreign}/lessons?${range}`, parent)).statusCode).toBe(
      404,
    );
    const bad = `from=${today}&to=${addDays(today, 90)}`;
    expect((await call('GET', `students/${s.own}/lessons?${bad}`, parent)).statusCode).toBe(400);
  });

  it('ustoz — guruhga biriktirilmagan bo‘lsa 404 (forbidden scope)', async () => {
    expect(
      (await call('GET', `students/${s.own}/lessons?${range}`, tokens.get('teacher')!)).statusCode,
    ).toBe(404);
  });
});
