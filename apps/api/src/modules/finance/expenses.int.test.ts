import {
  DEFAULT_BRANCH_ID,
  type ExpenseItem,
  type MonthlyPnLSummary,
  type RoleCode,
} from '@lg/contracts';
import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  invoiceLines,
  invoices,
  payments,
  payrollRuns,
  seed,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

let teacherToken: string;
let parentToken: string;
let directorToken: string;
let adminUserId: string;
let createdExpenseId: string;

const call = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  token: string,
  payload?: object,
) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);

  directorToken = tokens.get('director')!;
  adminUserId = await createUserWithRole(db, 'admin', '+998901234567');

  const teacherUserId = await createUserWithRole(db, 'teacher', '+998901119988');
  teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');

  const parentUserId = await createUserWithRole(db, 'guardian', '+998902229988');
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  // P&L uchun test ma'lumotlarini tayyorlaymiz:
  // 1) 2026-11 davri uchun 10 000 000 so'm to'lov tushumi (naqd va click)
  const studentRes = await call('POST', 'students', tokens.get('admin')!, {
    fullName: 'Xoliqov Olim',
    birthDate: '2012-05-10',
    gender: 'male',
  });
  const studentId = studentRes.json<{ id: string }>().id;

  const [inv] = await db
    .insert(invoices)
    .values({
      studentId,
      period: '2026-11',
      dueDate: '2026-11-10',
      total: 10_000_000n,
      status: 'paid',
    })
    .returning();

  await db.insert(invoiceLines).values({
    invoiceId: inv!.id,
    kind: 'tuition',
    amount: 10_000_000n,
    description: 'Noyabr oylik toʻlov',
  });

  await db.insert(payments).values([
    {
      studentId,
      amount: 6_000_000n,
      method: 'cash',
      paidAt: new Date('2026-11-03T10:00:00Z'),
      receivedBy: adminUserId,
      idempotencyKey: 'int-exp-pay-1',
    },
    {
      studentId,
      amount: 4_000_000n,
      method: 'card',
      paidAt: new Date('2026-11-12T14:30:00Z'),
      receivedBy: adminUserId,
      idempotencyKey: 'int-exp-pay-2',
    },
  ]);

  // 2) 2026-11 davri uchun 4 000 000 so'm tasdiqlangan oylik (payroll_run)
  await db.insert(payrollRuns).values({
    branchId: DEFAULT_BRANCH_ID,
    period: '2026-11',
    status: 'approved',
    totalAmount: 4_000_000n,
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-403: Xarajatlar va P&L (Expenses & P&L)', () => {
  it('RBAC: ustoz yoki ota-ona xarajat kiritolmaydi (403, expense.manage)', async () => {
    const resTeacher = await call('POST', 'expenses', teacherToken, {
      category: 'supplies',
      amount: '200000',
      date: '2026-11-05',
    });
    expect(resTeacher.statusCode).toBe(403);

    const resParent = await call('POST', 'expenses', parentToken, {
      category: 'supplies',
      amount: '200000',
      date: '2026-11-05',
    });
    expect(resParent.statusCode).toBe(403);
  });

  it('FR-FIN-1: Xarajat yaratish (Director/Admin expense.manage)', async () => {
    const res = await call('POST', 'expenses', directorToken, {
      category: 'rent',
      amount: '2500000',
      date: '2026-11-04',
      note: 'Noyabr oyi ijara toʻlovi',
    });
    expect(res.statusCode).toBe(201);
    const exp = res.json<ExpenseItem>();
    expect(exp.id).toBeDefined();
    expect(exp.category).toBe('rent');
    expect(exp.amount).toBe('2500000');
    expect(exp.note).toBe('Noyabr oyi ijara toʻlovi');
    createdExpenseId = exp.id;

    // Qo'shimcha yana bitta xarajat: marketing
    const res2 = await call('POST', 'expenses', directorToken, {
      category: 'marketing',
      amount: '500000',
      date: '2026-11-10',
      note: 'Instagram reklama',
    });
    expect(res2.statusCode).toBe(201);
  });

  it('Xarajatlar roʻyxati va filtrlar (kategoriya va sana)', async () => {
    const res = await call('GET', 'expenses?category=rent', directorToken);
    expect(res.statusCode).toBe(200);
    const items = res.json<ExpenseItem[]>();
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0]?.category).toBe('rent');
    // W-23: "Kiritdi" — xodim ismi (UUID emas).
    expect(items[0]?.createdByName).toBeTruthy();

    const resDate = await call('GET', 'expenses?from=2026-11-01&to=2026-11-08', directorToken);
    expect(resDate.statusCode).toBe(200);
    const dateItems = resDate.json<ExpenseItem[]>();
    expect(dateItems.some((i) => i.id === createdExpenseId)).toBe(true);
  });

  it('Xarajat tafsilotlari va tahrirlash (PATCH)', async () => {
    const getRes = await call('GET', `expenses/${createdExpenseId}`, directorToken);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json<ExpenseItem>().amount).toBe('2500000');

    const patchRes = await call('PATCH', `expenses/${createdExpenseId}`, directorToken, {
      amount: '2700000',
      note: 'Ijara va kommunal qoʻshib toʻlandi',
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json<ExpenseItem>().amount).toBe('2700000');
    expect(patchRes.json<ExpenseItem>().note).toBe('Ijara va kommunal qoʻshib toʻlandi');
  });

  it('RBAC: Ustoz yoki ota-ona P&L hisobotini koʻrolmaydi (403, finance.view)', async () => {
    const res = await call('GET', 'finance/pnl?period=2026-11', teacherToken);
    expect(res.statusCode).toBe(403);
  });

  it('FR-FIN-2: Oylik P&L hisoboti toʻgʻri hisoblanadi (Director)', async () => {
    const res = await call('GET', 'finance/pnl?period=2026-11', directorToken);
    expect(res.statusCode).toBe(200);
    const pnl = res.json<MonthlyPnLSummary>();

    // 1) Revenue: 6 000 000 (cash) + 4 000 000 (card) = 10 000 000
    expect(pnl.revenue).toBe('10000000');
    expect(pnl.revenueByMethod['cash']).toBe('6000000');
    expect(pnl.revenueByMethod['card']).toBe('4000000');

    // 2) Expenses: 2 700 000 (rent) + 500 000 (marketing) = 3 200 000
    expect(pnl.expenses).toBe('3200000');
    expect(pnl.expensesByCategory['rent']).toBe('2700000');
    expect(pnl.expensesByCategory['marketing']).toBe('500000');

    // 3) Payroll: 4 000 000
    expect(pnl.payroll).toBe('4000000');
    expect(pnl.totalCosts).toBe('7200000');

    // 4) Net Profit: 10 000 000 - 3 200 000 - 4 000 000 = 2 800 000
    expect(pnl.netProfit).toBe('2800000');

    // 5) Profit Margin: 2 800 000 / 10 000 000 = 28% = 2800 bp
    expect(pnl.profitMarginBp).toBe(2800);
  });

  it('Xarajatni oʻchirish (DELETE) va 404 tekshiruvi', async () => {
    // Vaqtinchalik xarajat yaratamiz
    const createRes = await call('POST', 'expenses', directorToken, {
      category: 'other',
      amount: '150000',
      date: '2026-11-20',
      note: 'Choy-kofe',
    });
    const tempId = createRes.json<{ id: string }>().id;

    const delRes = await call('DELETE', `expenses/${tempId}`, directorToken);
    expect(delRes.statusCode).toBe(200);

    const getRes = await call('GET', `expenses/${tempId}`, directorToken);
    expect(getRes.statusCode).toBe(404);
  });

  it.each([
    ['nol summa', { amount: '0' }],
    ['mavjud boʻlmagan kun', { date: '2026-02-31' }],
    ['kelajak sana', { date: '2099-01-01' }],
    ['chegaradan katta summa', { amount: '9'.repeat(25) }],
  ])('T-142: %s qabul qilinmaydi (400)', async (_n, bad) => {
    const ok = { category: 'other', amount: '1000', date: '2026-11-10' };
    const res = await call('POST', 'expenses', directorToken, { ...ok, ...bad });
    expect(res.statusCode).toBe(400);
    const patch = await call('PATCH', `expenses/${createdExpenseId}`, directorToken, bad);
    expect(patch.statusCode).toBe(400);
  });

  it('T-156: notoʻgʻri filtr/davr — 400, sahifa hajmi amal qiladi', async () => {
    expect((await call('GET', 'expenses?category=yoq', directorToken)).statusCode).toBe(400);
    expect((await call('GET', 'finance/pnl?period=2026-13', directorToken)).statusCode).toBe(400);
    expect((await call('GET', 'finance/pnl', directorToken)).statusCode).toBe(400);
    const one = await call('GET', 'expenses?limit=1', directorToken);
    expect(one.json<ExpenseItem[]>()).toHaveLength(1);
    expect((await call('GET', 'expenses?limit=1000', directorToken)).statusCode).toBe(400);
  });

  it('T-142: oʻchirilgan/tahrirlangan xarajatning oldingi holati auditda qoladi', async () => {
    const created = await call('POST', 'expenses', directorToken, {
      category: 'other',
      amount: '77000',
      date: '2026-11-12',
      note: 'Suv',
    });
    const id = created.json<ExpenseItem>().id;
    await call('PATCH', `expenses/${id}`, directorToken, { amount: '88000' });
    await call('DELETE', `expenses/${id}`, directorToken);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    const of = (action: string) => logs.filter((l) => l.action === action);
    expect(of('expense.create')).toHaveLength(1);
    expect(of('expense.update')[0]?.before).toMatchObject({ amount: '77000' });
    expect(of('expense.update')[0]?.after).toMatchObject({ amount: '88000' });
    expect(of('expense.delete')[0]?.before).toMatchObject({ amount: '88000', note: 'Suv' });
  });
});
