import {
  type BacktestReportResponse,
  type ChurnRiskResponse,
  DEFAULT_BRANCH_ID,
  type GroupOccupancyResponse,
  type RevenueForecastResponse,
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
  ledgerEntries,
  payments,
  seed,
  students,
} from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { ForecastsCron } from './forecasts.cron.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let directorToken: string;
let parentToken: string;

const call = (method: 'GET', url: string, token: string) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);

  directorToken = tokens.get('director')!;
  const parentUserId = await createUserWithRole(db, 'guardian', '+998909998877');
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  // Test kurs, guruh va o'quvchi
  const [course] = await db
    .insert(courses)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      name: 'Prognoz Test Kursi',
      defaultMonthlyPrice: 1000000n,
      lessonDurationMin: 80,
    })
    .returning();
  if (!course) throw new Error('course not created');

  const [group] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: course.id,
      name: 'Prognoz Guruhi',
      monthlyPrice: 1000000n,
      maxStudents: 20,
      startDate: '2026-09-01',
      gradingConfig: { scale: '0_5', kinds: ['homework', 'activity'] },
    })
    .returning();
  if (!group) throw new Error('group not created');

  const [student] = await db
    .insert(students)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      fullName: 'Akmal Normatov',
      searchName: 'akmal normatov',
    })
    .returning();
  if (!student) throw new Error('student not created');

  await db.insert(enrollments).values({
    groupId: group.id,
    studentId: student.id,
    startDate: '2026-09-01',
  });

  // 35 kun kechikkan hisob-faktura (BR-36 bo'yicha to'lov kechikishi maksimal 30 ball oladi)
  const pastDueDate = new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10);
  await db.insert(invoices).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    period: '2026-09',
    dueDate: pastDueDate,
    total: 1000000n,
    status: 'open',
  });

  await db.insert(ledgerEntries).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    entryType: 'invoice',
    amount: 1000000n,
  });

  // O'tgan oy uchun hisob-faktura va to'lov (backtest hisoboti tekshiruvi uchun)
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const prevMonth = d.toISOString().slice(0, 7);
  await db.insert(invoices).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    period: prevMonth,
    dueDate: `${prevMonth}-20`,
    total: 1000000n,
    status: 'paid',
  });
  await db.insert(payments).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    amount: 1000000n,
    method: 'cash',
    paidAt: new Date(`${prevMonth}-15T10:00:00Z`),
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-502: Prognozlar va churn risk (FR-DASH-3, BR-36)', () => {
  it('RBAC: Ota-ona prognozlar va backtestni koʻrolmaydi (403), Director koʻradi (200)', async () => {
    const revForbidden = await call('GET', 'forecasts/revenue', parentToken);
    expect(revForbidden.statusCode).toBe(403);

    const backForbidden = await call('GET', 'forecasts/backtest', parentToken);
    expect(backForbidden.statusCode).toBe(403);

    const revAllowed = await call('GET', 'forecasts/revenue', directorToken);
    expect(revAllowed.statusCode).toBe(200);
  });

  it('FR-DASH-3: 1–3 oylik tushum prognozi va ishonch oraliqlari qaytadi', async () => {
    const res = await call('GET', 'forecasts/revenue', directorToken);
    expect(res.statusCode).toBe(200);

    const body = res.json() as RevenueForecastResponse;
    expect(body.items).toHaveLength(3);

    for (const item of body.items) {
      expect(item.activeEnrollmentsCount).toBeGreaterThanOrEqual(1);
      const expected = BigInt(item.expected);
      const lower = BigInt(item.lowerBound);
      const upper = BigInt(item.upperBound);
      expect(lower).toBeLessThanOrEqual(expected);
      expect(expected).toBeLessThanOrEqual(upper);
    }
  });

  it('FR-DASH-3, BR-36: Ketish xavfi (churn risk) komponentlari tushuntirilgan holda qaytadi', async () => {
    const res = await call('GET', 'forecasts/churn', directorToken);
    expect(res.statusCode).toBe(200);

    const body = res.json() as ChurnRiskResponse;
    expect(body.totalStudents).toBeGreaterThanOrEqual(1);

    const akmal = body.items.find((s) => s.studentName === 'Akmal Normatov');
    expect(akmal).toBeDefined();
    expect(akmal?.factors.length).toBe(4);

    const payFactor = akmal?.factors.find((f) => f.factor === 'payment_delay');
    expect(payFactor).toBeDefined();
    expect(payFactor?.score).toBe(30); // 30+ kun kechikkanligi uchun to'liq 30 ball
  });

  it('FR-DASH-3: Guruh toʻlishi va prognoz churn tahlili toʻgʻri hisoblanadi', async () => {
    const res = await call('GET', 'forecasts/occupancy', directorToken);
    expect(res.statusCode).toBe(200);

    const body = res.json() as GroupOccupancyResponse;
    expect(body.items.length).toBeGreaterThanOrEqual(1);

    const g = body.items.find((item) => item.groupName === 'Prognoz Guruhi');
    expect(g).toBeDefined();
    expect(g?.capacity).toBe(20);
    expect(g?.currentActive).toBeGreaterThanOrEqual(1);
  });

  it('FR-DASH-3: Backtest hisoboti kutilgan va haqiqiy qiymatlarni solishtiradi', async () => {
    const res = await call('GET', 'forecasts/backtest', directorToken);
    expect(res.statusCode).toBe(200);

    const body = res.json() as BacktestReportResponse;
    expect(body).toHaveProperty('period');
    expect(body).toHaveProperty('errorPercentage');
    expect(BigInt(body.actualRevenue)).toBeGreaterThan(0n);
  });

  it('Dushanba 09:00 haftalik cron vazifasi roʻyxatdan oʻtgan va xatoliksiz bajariladi', async () => {
    const cronService = t.app.get(CronJobs);
    expect(cronService.get('forecasts.weekly-summary')).toBeDefined();

    const forecastsCron = t.app.get(ForecastsCron);
    await expect(forecastsCron.generateWeeklySummary()).resolves.not.toThrow();
  });
});
