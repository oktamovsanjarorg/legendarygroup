import {
  type BacktestReportResponse,
  type ChurnRiskResponse,
  DEFAULT_BRANCH_ID,
  type GroupOccupancyResponse,
  type RevenueForecastResponse,
  type RoleCode,
} from '@lg/contracts';
import {
  attendance,
  closeDb,
  courses,
  createDb,
  type Database,
  enrollments,
  groups,
  invoices,
  ledgerEntries,
  lessons,
  payments,
  seed,
  students,
} from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { ForecastsCron } from './forecasts.cron.js';
import { errorPercent } from './forecasts.service.js';
import { prevMonthRange } from './prev-month.js';

const todayTashkent = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());

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
  // Backtest: o'tgan oyning 15-sanasida (Toshkent) 700 000 so'm to'lov.
  await db.insert(payments).values({
    branchId: DEFAULT_BRANCH_ID,
    studentId: student.id,
    amount: 700000n,
    method: 'cash',
    paidAt: new Date(`${prevMonthRange(todayTashkent()).period}-15T12:00:00+05:00`),
  });

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

  it.each(['guardian', 'teacher'] as const)(
    'IDOR: %s (stats.operational — scope bilan) markaz churn/toʻlish prognozini koʻrolmaydi',
    async (role) => {
      for (const url of ['forecasts/churn', 'forecasts/occupancy'])
        expect((await call('GET', url, tokens.get(role)!)).statusCode).toBe(403);
    },
  );

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
    expect(body.period).toBe(prevMonthRange(todayTashkent()).period);
    // Qattiq '12100000' emas — o'tgan oydagi haqiqiy to'lovlar.
    expect(body.actualRevenue).toBe('700000');
    // Sentyabr hisobi umuman to'lanmagan — yig'ilish 0%, prognoz ham 0 (eski 50% pol emas).
    expect(body.predictedRevenue).toBe('0');
    expect(body.errorPercentage).toBe(
      errorPercent(BigInt(body.predictedRevenue), BigInt(body.actualRevenue)),
    );
  });

  it('Dushanba 09:00 haftalik cron vazifasi roʻyxatdan oʻtgan va xatoliksiz bajariladi', async () => {
    const cronService = t.app.get(CronJobs);
    expect(cronService.get('forecasts.weekly-summary')).toBeDefined();

    const forecastsCron = t.app.get(ForecastsCron);
    await expect(forecastsCron.generateWeeklySummary()).resolves.not.toThrow();
  });

  it('BR-36: guruh toʻlishi prognozi (occupancy churn) va backtest predictedChurnCount qatʼiy koeffitsient emas, churn modelidan hisoblanadi', async () => {
    // Yangi guruh va 2 ta o'quvchi
    const [c] = await db
      .insert(courses)
      .values({
        branchId: DEFAULT_BRANCH_ID,
        name: 'BR36 Test Kurs',
        defaultMonthlyPrice: 500000n,
        lessonDurationMin: 60,
      })
      .returning();

    const [g] = await db
      .insert(groups)
      .values({
        branchId: DEFAULT_BRANCH_ID,
        courseId: c!.id,
        name: 'BR-36 Guruh',
        monthlyPrice: 500000n,
        maxStudents: 10,
        startDate: '2026-09-01',
        gradingConfig: { scale: '0_5', kinds: ['homework', 'activity'] },
      })
      .returning();

    // 1-o'quvchi: Safe (xavfsiz)
    const [safeStudent] = await db
      .insert(students)
      .values({
        branchId: DEFAULT_BRANCH_ID,
        fullName: 'Safe Student',
        searchName: 'safe student',
      })
      .returning();
    await db.insert(enrollments).values({
      groupId: g!.id,
      studentId: safeStudent!.id,
      startDate: '2026-09-01',
    });

    // 2-o'quvchi: At-Risk (xavfli - to'lov 35 kun kechikkan, dars qoldirgan)
    const [riskStudent] = await db
      .insert(students)
      .values({
        branchId: DEFAULT_BRANCH_ID,
        fullName: 'Risk Student',
        searchName: 'risk student',
      })
      .returning();
    await db.insert(enrollments).values({
      groupId: g!.id,
      studentId: riskStudent!.id,
      startDate: '2026-09-01',
    });

    const pastDueDate = new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10);
    await db.insert(invoices).values({
      branchId: DEFAULT_BRANCH_ID,
      studentId: riskStudent!.id,
      period: '2026-09',
      dueDate: pastDueDate,
      total: 500000n,
      status: 'open',
    });

    // O'qituvchi va dars (oxirgi 4 haftada qoldirilgan dars)
    const recentLessonDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const teacherId = await createUserWithRole(db, 'teacher', '+998901239988');
    const [lesson] = await db
      .insert(lessons)
      .values({
        groupId: g!.id,
        teacherId,
        date: recentLessonDate,
        startTime: '10:00',
        endTime: '11:00',
        status: 'done',
      })
      .returning();

    await db.insert(attendance).values({
      lessonId: lesson!.id,
      studentId: riskStudent!.id,
      status: 'absent',
      markedBy: teacherId,
    });

    // 1) Guruh to'lishi prognozini tekshiramiz
    const occRes = await call('GET', 'forecasts/occupancy', directorToken);
    expect(occRes.statusCode).toBe(200);
    const occBody = occRes.json() as GroupOccupancyResponse;
    const targetGroup = occBody.items.find((item) => item.groupId === g!.id);
    expect(targetGroup).toBeDefined();
    expect(targetGroup?.currentActive).toBe(2);
    // Eski qat'iy koeffitsient: Math.round(2 * 0.1) = 0 bo'lardi.
    // BR-36 modeli bo'yicha: 1 ta at-risk o'quvchi bor -> projectedChurn = 1 bo'lishi shart!
    expect(targetGroup?.projectedChurn).toBe(1);

    // 2) Backtest hisobotini tekshiramiz
    const backRes = await call('GET', 'forecasts/backtest', directorToken);
    expect(backRes.statusCode).toBe(200);
    const backBody = backRes.json() as BacktestReportResponse;
    // Backtest — o'tgan oy BOSHIDAGI holat bo'yicha prognoz (kelajak ma'lumoti sizmaydi):
    // xavf belgilari (kechikkan to'lov, qoldirilgan dars) o'tgan oy boshidan keyin paydo bo'lgan,
    // shuning uchun o'sha paytdagi prognoz — 0 (eski qat'iy 4 emas).
    expect(backBody.predictedChurnCount).toBe(0);
  });
});
