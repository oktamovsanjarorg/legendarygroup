import type { PaymentPreview, RoleCode, StudentLedgerSummary } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

/** W-13 preview (T-204, BR-12): createPayment bilan bir xil FIFO, yozuvsiz. */
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId = '';

const call = (method: 'GET' | 'POST', url: string, role: RoleCode, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role)!}` },
  });
const preview = (amount: string, role: RoleCode = 'admin') =>
  call('GET', `billing/payments/preview?studentId=${studentId}&amount=${amount}`, role);

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const id = async (url: string, body: object) =>
    (await call('POST', url, 'admin', body)).json<{ id: string }>().id;
  const courseId = await id('courses', {
    name: 'Ingliz',
    defaultMonthlyPrice: '400000',
    lessonDurationMin: 60,
  });
  const groupId = await id('groups', {
    courseId,
    name: 'EN-1',
    maxStudents: 10,
    startDate: '2026-10-01',
    monthlyPrice: '400000',
  });
  studentId = await id('students', { fullName: 'Preview Oʻquvchi' });
  await call('POST', 'enrollments', 'admin', { studentId, groupId, startDate: '2026-10-01' });
  await call('POST', 'billing/invoices/generate', 'admin', { period: '2026-10' });
  await call('POST', 'billing/invoices/generate', 'admin', { period: '2026-11' });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('GET billing/payments/preview (T-204, BR-12)', () => {
  it('BR-12: eng eski oy birinchi yopiladi, qoldiq — keyingi oyga qisman, ortigʻi — avans', async () => {
    const res = await preview('600000');
    expect(res.statusCode).toBe(200);
    const p = res.json<PaymentPreview>();
    expect(p.debt).toBe('800000');
    expect(p.parts).toEqual([
      { period: '2026-10', amount: '400000', closes: true },
      { period: '2026-11', amount: '200000', closes: false },
    ]);
    expect(p.advance).toBe('0');
    expect((await preview('1000000')).json<PaymentPreview>().advance).toBe('200000');
  });

  it('BR-12: hech narsa yozmaydi — balans oʻzgarmaydi', async () => {
    await preview('800000');
    const s = (
      await call('GET', `billing/ledger/${studentId}/summary`, 'admin')
    ).json<StudentLedgerSummary>();
    expect(s.totalDebt).toBe('800000');
  });

  it('forbidden: ustoz va ota-ona — 403; notoʻgʻri summa — 400', async () => {
    expect((await preview('1000', 'teacher')).statusCode).toBe(403);
    expect((await preview('1000', 'guardian')).statusCode).toBe(403);
    expect((await preview('-5')).statusCode).toBe(400);
  });
});
