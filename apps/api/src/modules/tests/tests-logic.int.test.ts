import type { RoleCode, TestItem } from '@lg/contracts';
import { closeDb, createDb, type Database, notifications, seed, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let admin: string;
let groupId: string;
let memberId: string;
let outsiderId: string;

const call = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });
const code = (r: { json: <T>() => T }) => r.json<{ code: string }>().code;

const newTest = async () =>
  (
    await call('POST', 'tests', admin, {
      groupId,
      title: 'Mock',
      date: '2026-11-15',
      maxScore: 100,
    })
  ).json<TestItem>().id;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  admin = tokens.get('admin') ?? '';
  const course = await call('POST', 'courses', admin, {
    name: 'Matematika',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 90,
  });
  const room = await call('POST', 'rooms', admin, { name: 'Xona 1', capacity: 10 });
  groupId = (
    await call('POST', 'groups', admin, {
      courseId: course.json<{ id: string }>().id,
      roomId: room.json<{ id: string }>().id,
      name: 'MAT-01',
      maxStudents: 10,
      startDate: '2026-11-01',
      monthlyPrice: '500000',
    })
  ).json<{ id: string }>().id;
  const student = async (fullName: string, phone: string) =>
    (
      await call('POST', 'students', admin, {
        fullName,
        guardians: [{ fullName: 'Ota-ona', phone, relation: 'mother' }],
      })
    ).json<{ id: string }>().id;
  memberId = await student('Aliyev Vali', '+998901110001');
  outsiderId = await student('Begona Bola', '+998901110002');
  await call('POST', 'enrollments', admin, {
    studentId: memberId,
    groupId,
    startDate: '2026-11-01',
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-154 testlar mantiqi (BR-34/35)', () => {
  it('BR-35: guruhda boʻlmagan oʻquvchiga ball yozilmaydi (natija va import)', async () => {
    const id = await newTest();
    const body = { results: [{ studentId: outsiderId, score: 50 }] };
    for (const path of ['results', 'import-confirm']) {
      const res = await call('POST', `tests/${id}/${path}`, admin, body);
      expect(res.statusCode).toBe(400);
      expect(code(res)).toBe('TEST_STUDENT_NOT_IN_GROUP');
    }
  });

  it('BR-34: natija bor — maks. ball oʻzgarmaydi; nom va sana oʻzgaradi', async () => {
    const id = await newTest();
    await call('POST', `tests/${id}/results`, admin, {
      results: [{ studentId: memberId, score: 90 }],
    });
    const res = await call('PATCH', `tests/${id}`, admin, { maxScore: 50 });
    expect(res.statusCode).toBe(409);
    expect(code(res)).toBe('TEST_HAS_RESULTS');
    expect((await call('PATCH', `tests/${id}`, admin, { title: 'Yangi nom' })).statusCode).toBe(
      200,
    );
  });

  it('natijasiz test eʼlon qilinmaydi', async () => {
    const res = await call('POST', `tests/${await newTest()}/publish`, admin, {});
    expect(res.statusCode).toBe(400);
    expect(code(res)).toBe('TEST_NO_RESULTS');
  });

  it('shablon bot chatiga yuboriladi; botga ulanmagan — NO_TELEGRAM', async () => {
    const id = await newTest();
    const linked = await createUserWithRole(db, 'admin');
    await db.update(users).set({ telegramId: 990001n }).where(eq(users.id, linked));
    const res = await call(
      'POST',
      `tests/${id}/template/send`,
      await tokenFor(t, db, linked, 'admin'),
    );
    expect(res.statusCode).toBe(201);
    const sent = await db.select().from(notifications).where(eq(notifications.userId, linked));
    expect(sent.map((n) => n.type)).toEqual(['report_file']);

    const bare = await createUserWithRole(db, 'admin');
    const res2 = await call(
      'POST',
      `tests/${id}/template/send`,
      await tokenFor(t, db, bare, 'admin'),
    );
    expect(res2.statusCode).toBe(409);
    expect(code(res2)).toBe('NO_TELEGRAM');
  });

  it('RBAC: ota-ona shablon soʻray olmaydi (403)', async () => {
    const res = await call(
      'POST',
      `tests/${await newTest()}/template/send`,
      tokens.get('guardian') ?? '',
      {},
    );
    expect(res.statusCode).toBe(403);
  });
});
