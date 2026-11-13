import {
  DEFAULT_BRANCH_ID,
  type DebtAgingResponse,
  type RevenueReportResponse,
  type RoleCode,
} from '@lg/contracts';
import {
  closeDb,
  courses,
  createDb,
  type Database,
  enrollments,
  groups,
  invoices,
  leads,
  ledgerEntries,
  payments,
  seed,
  students,
} from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let directorToken: string;
let parentToken: string;

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
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
  const parentUserId = await createUserWithRole(db, 'guardian', '+998907771122');
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  // Test o'quvchi, kurs, guruh va to'lov yaratamiz
  const [course] = await db
    .insert(courses)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      name: 'Hisobot Test Kursi',
      defaultMonthlyPrice: 800000n,
      lessonDurationMin: 80,
    })
    .returning();
  if (!course) throw new Error('course not created');

  const [group] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: course.id,
      name: 'Hisobot Guruhi 101',
      monthlyPrice: 800000n,
      maxStudents: 15,
      startDate: '2026-09-01',
      gradingConfig: { scale: '0_5', kinds: ['homework', 'activity'] },
    })
    .returning();
  if (!group) throw new Error('group not created');

  const [student] = await db
    .insert(students)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      fullName: 'Sardor Qodirov',
      searchName: 'sardor qodirov',
    })
    .returning();
  if (!student) throw new Error('student not created');

  await db.insert(enrollments).values({
    groupId: group.id,
    studentId: student.id,
    startDate: '2026-10-01',
  });

  // 1) To'lov (Daromad hisoboti uchun)
  await db.insert(payments).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    amount: 1500000n,
    method: 'cash',
  });

  // 2) Qarzdorlik (Aging hisoboti uchun: 15 kun kechikkan)
  const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10);
  await db.insert(invoices).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    period: '2026-10',
    dueDate: fifteenDaysAgo,
    total: 800000n,
    status: 'open',
  });

  await db.insert(ledgerEntries).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    entryType: 'invoice',
    amount: 800000n,
  });

  // 3) Lidlar (Lid hisoboti uchun)
  await db.insert(leads).values([
    {
      branchId: DEFAULT_BRANCH_ID,
      fullName: 'Lid Birinchi',
      searchName: 'lid birinchi',
      phone: '+998901112233',
      source: 'telegram',
      status: 'won',
      studentId: student.id,
    },
    {
      branchId: DEFAULT_BRANCH_ID,
      fullName: 'Lid Ikkinchi',
      searchName: 'lid ikkinchi',
      phone: '+998902223344',
      source: 'telegram',
      status: 'new',
    },
  ]);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-501: Hisobotlar toʻplami va eksport (FR-DASH-2, 4)', () => {
  it('RBAC: Ota-ona moliya hisobotini koʻrolmaydi (403), Director koʻradi (200)', async () => {
    const forbiddenRes = await call('GET', 'reports/revenue', parentToken);
    expect(forbiddenRes.statusCode).toBe(403);

    const allowedRes = await call('GET', 'reports/revenue', directorToken);
    expect(allowedRes.statusCode).toBe(200);
  });

  it('FR-DASH-2: Daromad hisoboti (oylik guruhlash) toʻgʻri hisoblanadi', async () => {
    const res = await call('GET', 'reports/revenue?groupBy=month', directorToken);
    expect(res.statusCode).toBe(200);

    const body = res.json() as RevenueReportResponse;
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(BigInt(body.totalRevenue)).toBeGreaterThanOrEqual(1500000n);
    expect(body.totalPayments).toBeGreaterThanOrEqual(1);
  });

  it('FR-DASH-2: Qarzdorlik yoshi (aging) hisoboti oʻquvchini overdue (8-30 kun) guruhiga qoʻyadi', async () => {
    const res = await call('GET', 'reports/debt-aging', directorToken);
    expect(res.statusCode).toBe(200);

    const body = res.json() as DebtAgingResponse;
    expect(body.totalDebtors).toBeGreaterThanOrEqual(1);
    expect(body.buckets.overdue.studentCount).toBeGreaterThanOrEqual(1);
    expect(BigInt(body.buckets.overdue.totalDebt)).toBeGreaterThanOrEqual(800000n);

    const debtor = body.debtors.find((d) => d.studentName === 'Sardor Qodirov');
    expect(debtor).toBeDefined();
    expect(debtor?.bucket).toBe('overdue');
    expect(debtor?.daysOverdue).toBeGreaterThanOrEqual(14);
  });

  it('FR-DASH-2: Lid konversiyasi hisoboti manbalar boʻyicha toʻgʻri jamlanadi', async () => {
    const res = await call('GET', 'reports/leads', directorToken);
    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      totalLeads: number;
      totalWon: number;
      overallConversionPercentBp: number;
    };
    expect(body.totalLeads).toBeGreaterThanOrEqual(2);
    expect(body.totalWon).toBeGreaterThanOrEqual(1);
    expect(body.overallConversionPercentBp).toBeGreaterThan(0);
  });

  it('FR-DASH-2: Kohorta saqlanish va ustoz samaradorligi hisobotlari ishlaydi', async () => {
    const cohortRes = await call('GET', 'reports/cohort?monthsCount=6', directorToken);
    expect(cohortRes.statusCode).toBe(200);
    expect(cohortRes.json()).toHaveProperty('cohorts');

    const teacherRes = await call('GET', 'reports/teacher-performance', directorToken);
    expect(teacherRes.statusCode).toBe(200);
    expect(teacherRes.json()).toHaveProperty('items');
  });

  it('FR-DASH-4: Excel eksport (.xlsx) muvaffaqiyatli yuklanadi', async () => {
    const res = await call('GET', 'reports/revenue/export/excel', directorToken);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toContain('.xlsx');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });

  it('FR-DASH-4: PDF eksport (.pdf) muvaffaqiyatli yuklanadi', async () => {
    const res = await call('GET', 'reports/revenue/export/pdf', directorToken);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });
});
