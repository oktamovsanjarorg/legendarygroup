import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed, students } from '@lg/db';
import { formatDateToYmd } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let groupId = '';
const today = formatDateToYmd(new Date());

const call = (method: 'GET' | 'POST', url: string, payload?: object, role: RoleCode = 'admin') =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role) ?? ''}` },
  });
const add = (fullName: string, role: RoleCode = 'admin') =>
  call(
    'POST',
    'students',
    {
      fullName,
      guardians: [{ fullName: `${fullName} onasi`, phone: '+998901112233', relation: 'mother' }],
      enrollment: { groupId, startDate: today },
    },
    role,
  );

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const idOf = async (url: string, body: object) =>
    (await call('POST', url, body)).json<{ id: string }>().id;
  const course = await idOf('courses', {
    name: 'Qabul kursi',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 90,
  });
  groupId = await idOf('groups', {
    courseId: course,
    name: 'Q-1',
    maxStudents: 1,
    startDate: today,
  });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Q-97: oʻquvchi + guruh bitta qadamda', () => {
  it('yaratiladi va guruhga yoziladi; guruh toʻla — 409, oʻquvchi ham yaratilmaydi', async () => {
    const res = await add('Birinchi Qabul');
    expect(res.statusCode).toBe(201);
    const id = res.json<{ id: string }>().id;
    const enr = await call('GET', `students/${id}/enrollments`);
    expect(enr.json<{ group: { id: string } }[]>().map((e) => e.group.id)).toEqual([groupId]);

    const full = await add('Ikkinchi Qabul');
    expect([full.statusCode, full.json<{ code: string }>().code]).toEqual([409, 'GROUP_FULL']);
    const left = await db.select().from(students).where(eq(students.fullName, 'Ikkinchi Qabul'));
    expect(left).toEqual([]);
  });

  it('ustoz — 403', async () => {
    expect((await add('Ustoz Qabul', 'teacher')).statusCode).toBe(403);
  });
});
