import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, invoices, seed } from '@lg/db';
import { formatDateToYmd } from '@lg/domain';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let groupId = '';
const today = formatDateToYmd(new Date());
const period = today.slice(0, 7);
const prev = (() => {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
})();

const call = (method: 'GET' | 'POST', url: string, payload?: object, role: RoleCode = 'admin') =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role) ?? ''}` },
  });
const idOf = async (url: string, body: object) =>
  (await call('POST', url, body)).json<{ id: string }>().id;
const student = async (name: string) => {
  const id = await idOf('students', { fullName: name });
  const enrollmentId = await idOf('enrollments', { studentId: id, groupId, startDate: today });
  return { id, enrollmentId };
};

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const course = await idOf('courses', {
    name: 'Setup kursi',
    defaultMonthlyPrice: '600000',
    lessonDurationMin: 90,
  });
  groupId = await idOf('groups', {
    courseId: course,
    name: 'S-1',
    maxStudents: 20,
    startDate: today,
  });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-145 boshlangʻich holat (BR-3, BR-12)', () => {
  it('kelgan sana + oldingi qarz → ikki oy hisobi; toʻlov avval eski oyni yopadi; takror — 409', async () => {
    const s = await student('Setup Testov');
    expect((await call('GET', `billing/students/${s.id}/setup`)).json()).toEqual({
      done: false,
      period,
    });
    const res = await call('POST', `billing/students/${s.id}/setup`, {
      enrollments: [{ enrollmentId: s.enrollmentId, startDate: `${prev}-05` }],
      openingDebts: [{ enrollmentId: s.enrollmentId, period: prev, amount: '600000' }],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ done: true, period });

    const rows = await db
      .select({ period: invoices.period, total: invoices.total })
      .from(invoices)
      .where(eq(invoices.studentId, s.id))
      .orderBy(asc(invoices.period));
    // Oy boshidan oldin kelgan — joriy oy toʻliq (BR-3 qoʻllanmaydi).
    expect(rows).toEqual([
      { period: prev, total: 600000n },
      { period, total: 600000n },
    ]);

    const preview = await call('GET', `billing/payments/preview?studentId=${s.id}&amount=600000`);
    expect(preview.json<{ parts: { period: string; closes: boolean }[] }>().parts).toEqual([
      { period: prev, amount: '600000', closes: true },
    ]);

    const again = await call('POST', `billing/students/${s.id}/setup`, {});
    expect(again.statusCode).toBe(409);
    expect(again.json<{ code: string }>().code).toBe('BILLING_ALREADY_SET');
  });

  it('kelajak sana, joriy oy qarzi yoki begona aʼzolik — rad', async () => {
    const a = await student('Rad Testov');
    const b = await student('Begona Testov');
    const post = (body: object) => call('POST', `billing/students/${a.id}/setup`, body);
    expect(
      (await post({ enrollments: [{ enrollmentId: a.enrollmentId, startDate: '2999-01-01' }] }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await post({
          openingDebts: [{ enrollmentId: a.enrollmentId, period, amount: '1000' }],
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await post({ enrollments: [{ enrollmentId: b.enrollmentId, startDate: today }] }))
        .statusCode,
    ).toBe(404);
  });

  it('ruxsat: ustoz va ota-ona — 403', async () => {
    const s = await student('Ruxsat Testov');
    for (const role of ['teacher', 'guardian'] as const) {
      expect((await call('POST', `billing/students/${s.id}/setup`, {}, role)).statusCode).toBe(403);
      expect(
        (await call('GET', `billing/students/${s.id}/setup`, undefined, role)).statusCode,
      ).toBe(403);
    }
  });
});
