import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let groupId = '';
const today = formatDateToYmd(new Date());
const start = addDays(today, -30);

const call = (method: 'GET' | 'POST', url: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get('admin') ?? ''}` },
  });
const idOf = async (url: string, body: object) =>
  (await call('POST', url, body)).json<{ id: string }>().id;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const course = await idOf('courses', {
    name: 'Arxiv kursi',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 90,
  });
  groupId = await idOf('groups', {
    courseId: course,
    name: 'A-1',
    maxStudents: 10,
    startDate: start,
  });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Arxivlash va faol guruh (FR-STU-6, Q-93)', () => {
  it('guruhda turgan oʻquvchi arxivlanmaydi — 409; chiqarilgandan keyin arxivlanadi', async () => {
    const id = await idOf('students', { fullName: 'Guruhli Testov' });
    const enr = await idOf('enrollments', { studentId: id, groupId, startDate: start });

    const blocked = await call('POST', `students/${id}/archive`);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json<{ code: string }>().code).toBe('STUDENT_HAS_ACTIVE_GROUPS');

    const end = await call('POST', `enrollments/${enr}/end`, { endDate: today, reason: 'left' });
    expect(end.statusCode).toBeLessThan(300);
    expect((await call('POST', `students/${id}/archive`)).statusCode).toBe(200);
  });

  it('kelajak sanada chiqariladigan aʼzolik ham faol — 409', async () => {
    const id = await idOf('students', { fullName: 'Kelajak Testov' });
    const enr = await idOf('enrollments', { studentId: id, groupId, startDate: start });
    await call('POST', `enrollments/${enr}/end`, { endDate: addDays(today, 10), reason: 'left' });
    expect((await call('POST', `students/${id}/archive`)).statusCode).toBe(409);
  });

  it('guruhsiz oʻquvchi — arxivlanadi', async () => {
    const id = await idOf('students', { fullName: 'Guruhsiz Testov' });
    expect((await call('POST', `students/${id}/archive`)).statusCode).toBe(200);
  });
});
