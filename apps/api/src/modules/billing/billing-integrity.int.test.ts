import type { DebtorListResponse, Invoice, PaymentDetail, RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, invoices, payments, seed } from '@lg/db';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

// agy kodi tekshiruvi: invoice holati hech qachon yangilanmas, storno taqsimotni qaytarmas edi,
// qarzdorlar summasi to'lovlarni hisobga olmas edi.
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId: string;
let paymentA: string;
let paymentB: string;

let keySeq = 0;
const call = (method: 'GET' | 'POST', url: string, role: RoleCode, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: {
      authorization: `Bearer ${tokens.get(role)!}`,
      ...(method === 'POST' ? { 'idempotency-key': `bi-${process.pid}-${++keySeq}` } : {}),
    },
  });

const pay = async (amount: string): Promise<PaymentDetail> => {
  const res = await call('POST', 'billing/payments', 'admin', {
    studentId,
    amount,
    method: 'cash',
  });
  expect(res.statusCode).toBe(201);
  return res.json<PaymentDetail>();
};

const invoiceStatus = async (period: string): Promise<string | undefined> => {
  const [row] = await db
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.studentId, studentId), eq(invoices.period, period)));
  return row?.status;
};

const debtOf = async (): Promise<string | null> => {
  const res = await call('GET', 'billing/debtors?limit=100', 'admin');
  expect(res.statusCode).toBe(200);
  return res.json<DebtorListResponse>().items.find((i) => i.id === studentId)?.debt ?? null;
};

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);

  const course = await call('POST', 'courses', 'admin', {
    name: 'Kimyo',
    defaultMonthlyPrice: '400000',
    lessonDurationMin: 60,
  });
  const group = await call('POST', 'groups', 'admin', {
    courseId: course.json<{ id: string }>().id,
    name: 'KIM-01',
    maxStudents: 10,
    startDate: '2026-10-01',
    monthlyPrice: '400000',
  });
  const student = await call('POST', 'students', 'admin', {
    fullName: 'Ergasheva Madina',
    phone: '+998905554433',
  });
  studentId = student.json<{ id: string }>().id;
  await call('POST', 'enrollments', 'admin', {
    studentId,
    groupId: group.json<{ id: string }>().id,
    startDate: '2026-10-01',
  });
  const gen = await call('POST', 'billing/invoices/generate', 'admin', { period: '2026-10' });
  expect(gen.statusCode).toBe(201);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('BR-11/12/13: invoice holati, storno va qarz summasi', () => {
  it('BR-12: qisman toʻlov — partially_paid, qarzdorlarda qolgan summa', async () => {
    paymentA = (await pay('150000')).id;
    expect(await invoiceStatus('2026-10')).toBe('partially_paid');
    expect(await debtOf()).toBe('250000');
  });

  it('BR-12: toʻliq yopilgan invoice — paid, qarzdorlar roʻyxatida yoʻq', async () => {
    paymentB = (await pay('250000')).id;
    expect(await invoiceStatus('2026-10')).toBe('paid');
    expect(await debtOf()).toBeNull();
  });

  it('FR-PAY-9: storno — reversal_of bogʻlanadi, taqsimot bekor, qarz qaytadi', async () => {
    const res = await call('POST', `billing/payments/${paymentB}/reverse`, 'admin', {
      reason: 'Notoʻgʻri summa',
    });
    expect(res.statusCode).toBe(201);
    const [rev] = await db.select().from(payments).where(eq(payments.reversalOf, paymentB));
    expect(rev?.amount).toBe(-250_000n);
    expect(await invoiceStatus('2026-10')).toBe('partially_paid');
    expect(await debtOf()).toBe('250000');
  });

  it('FR-PAY-9: parallel ikki storno — bittasi oʻtadi, ikkinchisi 409', async () => {
    const results = await Promise.all(
      [1, 2].map(() =>
        call('POST', `billing/payments/${paymentA}/reverse`, 'admin', { reason: 'Takror' }),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(await invoiceStatus('2026-10')).toBe('open');
    expect(await debtOf()).toBe('400000');
  });

  it('BR-12: parallel toʻlovlar bitta qatorni ortiqcha yopmaydi; ortigʻi avans', async () => {
    const [a, b] = await Promise.all([pay('300000'), pay('300000')]);
    const advances = [a.advance, b.advance].map(BigInt).reduce((x, y) => x + y, 0n);
    expect(advances).toBe(200_000n);
    const [over] = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM invoice_lines il
      WHERE (SELECT coalesce(sum(pa.amount), 0) FROM payment_allocations pa
             WHERE pa.invoice_line_id = il.id
               AND NOT EXISTS (SELECT 1 FROM payments r WHERE r.reversal_of = pa.payment_id)
            ) > il.amount`);
    expect(over?.n).toBe(0);
    expect(await invoiceStatus('2026-10')).toBe('paid');
  });

  it('BR-12: keyingi oy invoice yaratilganda avans avtomatik qoʻllanadi', async () => {
    const gen = await call('POST', 'billing/invoices/generate', 'admin', { period: '2026-11' });
    expect(gen.statusCode).toBe(201);
    expect(await invoiceStatus('2026-11')).toBe('partially_paid');
    expect(await debtOf()).toBe('200000');

    const list = await call('GET', `billing/invoices?studentId=${studentId}`, 'admin');
    const nov = list.json<Invoice[]>().find((i) => i.period === '2026-11');
    expect(nov?.status).toBe('partially_paid');
  });
});
