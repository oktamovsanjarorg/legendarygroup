import type {
  CashDay,
  DiscountListResponse,
  PaymentPreview,
  PaymentView,
  RoleCode,
  StudentLedgerSummary,
} from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

/** W-13 preview (T-204, BR-12): createPayment bilan bir xil FIFO, yozuvsiz. */
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId = '';

const call = (method: 'GET' | 'POST', url: string, role: RoleCode, payload?: object) => {
  // BR-11: kalit — faqat sarlavhada.
  const { idempotencyKey, ...body } = (payload ?? {}) as Record<string, unknown>;
  const headers: Record<string, string> = { authorization: `Bearer ${tokens.get(role)!}` };
  if (typeof idempotencyKey === 'string') headers['idempotency-key'] = idempotencyKey;
  return t.app.inject({ method, url: `/api/${url}`, payload: payload ? body : undefined, headers });
};
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

describe('GET billing/payments/:id/view (W-17, FR-PAY-8/9, BR-16)', () => {
  it('chek, oy boʻyicha taqsimot, kiritgan xodim; storno qilingach — sabab', async () => {
    const paid = await call('POST', 'billing/payments', 'admin', {
      studentId,
      amount: '500000',
      method: 'cash',
      idempotencyKey: 'view-pay-1',
    });
    const id = paid.json<{ id: string }>().id;
    const v = (await call('GET', `billing/payments/${id}/view`, 'admin')).json<PaymentView>();
    expect(v.studentName).toBe('Preview Oʻquvchi');
    expect(v.receiptNumber).toMatch(/^LG-\d{4}-\d{6}$/);
    expect(v.verifyUrl).toMatch(/\/verify\/[0-9a-f]{32}$/);
    expect(v.allocations).toEqual([
      { period: '2026-10', amount: '400000' },
      { period: '2026-11', amount: '100000' },
    ]);
    expect(v.reversed).toBeNull();
    expect(v.canReverseNow).toBe(true);

    await call('POST', `billing/payments/${id}/reverse`, 'admin', { reason: 'Kassa xatosi' });
    const after = (await call('GET', `billing/payments/${id}/view`, 'admin')).json<PaymentView>();
    expect(after.reversed?.reason).toBe('Kassa xatosi');
  });

  it('forbidden: ustoz — 403; yoʻq toʻlov — 404', async () => {
    const missing = '22222222-2222-4222-8222-222222222222';
    expect((await call('GET', `billing/payments/${missing}/view`, 'teacher')).statusCode).toBe(403);
    expect((await call('GET', `billing/payments/${missing}/view`, 'admin')).statusCode).toBe(404);
  });
});

describe('GET billing/discounts (W-18, BR-18)', () => {
  it('BR-18: amaldagi chegirma — sabab va bergan xodim audit’dan; ustoz/ota-ona — 403', async () => {
    const [enr] = (await call('GET', `students/${studentId}/enrollments`, 'admin')).json<
      { id: string }[]
    >();
    const set = await t.app.inject({
      method: 'PATCH',
      url: `/api/billing/enrollments/${enr!.id}/discount`,
      payload: { percent: 5, reason: 'Aka-uka' },
      headers: { authorization: `Bearer ${tokens.get('admin')!}` },
    });
    expect(set.statusCode).toBe(200);
    const res = (await call('GET', 'billing/discounts', 'admin')).json<DiscountListResponse>();
    expect(res.adminLimitPercent).toBeGreaterThan(0);
    expect(res.items).toEqual([
      expect.objectContaining({
        enrollmentId: enr!.id,
        percent: 5,
        reason: 'Aka-uka',
        group: 'EN-1',
      }),
    ]);
    expect(res.items[0]?.by).toBeTruthy();
    expect((await call('GET', 'billing/discounts', 'teacher')).statusCode).toBe(403);
    expect((await call('GET', 'billing/discounts', 'guardian')).statusCode).toBe(403);
  });
});

describe('GET billing/cash/day (W-16, FR-PAY-10)', () => {
  it('bugungi naqd toʻlovlar (storno — manfiy) yigʻindisi = expectedCash; yopilgach — kim', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(
      new Date(),
    );
    const day = (await call('GET', `billing/cash/day?date=${today}`, 'admin')).json<CashDay>();
    const sum = day.payments.reduce((s, p) => s + BigInt(p.amount), 0n);
    expect(day.payments.length).toBeGreaterThanOrEqual(2);
    expect(day.payments.some((p) => BigInt(p.amount) < 0n)).toBe(true);
    expect(sum.toString()).toBe(day.expectedCash);
    expect(day.closed).toBeNull();
    await call('POST', 'billing/cash/close', 'admin', {
      date: today,
      countedCash: day.expectedCash,
    });
    const after = (await call('GET', `billing/cash/day?date=${today}`, 'admin')).json<CashDay>();
    expect(after.closed?.by).toBeTruthy();
    expect((await call('GET', `billing/cash/day?date=${today}`, 'teacher')).statusCode).toBe(403);
  });
});
