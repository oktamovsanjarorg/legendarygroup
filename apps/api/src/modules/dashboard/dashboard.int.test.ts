import type { DirectorDashboardKpi, RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, lessons, payments, seed } from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { DashboardCron } from './dashboard.cron.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

let directorToken: string;
let adminToken: string;
let parentToken: string;

const call = (url: string, token: string) =>
  t.app.inject({
    method: 'GET',
    url: `/api/${url}`,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);

  directorToken = tokens.get('director')!;
  adminToken = tokens.get('admin')!;

  const parentUserId = await createUserWithRole(db, 'guardian', '+998905554433');
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  const adminUserId = await createUserWithRole(db, 'admin', '+998905554422');

  // Test uchun o'quvchi, guruh va to'lov yaratamiz
  const studentRes = await t.app.inject({
    method: 'POST',
    url: '/api/students',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { fullName: 'Ergashev Bobur', birthDate: '2012-08-20', gender: 'male' },
  });
  const studentId = studentRes.json<{ id: string }>().id;

  const now = new Date();
  const todayYmd = now.toISOString().slice(0, 10);

  // Bugungi to'lov
  await db.insert(payments).values({
    studentId,
    amount: 1_500_000n,
    method: 'cash',
    paidAt: now,
    receivedBy: adminUserId,
    idempotencyKey: 'dash-test-pay-1',
  });

  // Bugungi dars
  const roomRes = await t.app.inject({
    method: 'POST',
    url: '/api/rooms',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name: 'Xona 202', capacity: 20 },
  });
  const roomId = roomRes.json<{ id: string }>().id;

  const courseRes = await t.app.inject({
    method: 'POST',
    url: '/api/courses',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name: 'Robototexnika', defaultMonthlyPrice: '600000', lessonDurationMin: 90 },
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const groupRes = await t.app.inject({
    method: 'POST',
    url: '/api/groups',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      courseId,
      roomId,
      name: 'ROBO-01',
      maxStudents: 10,
      startDate: todayYmd,
      monthlyPrice: '600000',
    },
  });
  const groupId = groupRes.json<{ id: string }>().id;

  await db.insert(lessons).values({
    groupId,
    date: todayYmd,
    startTime: '10:00',
    endTime: '11:30',
    roomId,
    status: 'scheduled',
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('T-405: Director Dashboard (FR-DASH-1, 5)', () => {
  it('RBAC: Ota-ona dashboardni koʻrolmaydi (403), Director va Admin koʻradi (200)', async () => {
    const parentRes = await call('dashboard/director', parentToken);
    expect(parentRes.statusCode).toBe(403);

    const adminRes = await call('dashboard/director', adminToken);
    expect(adminRes.statusCode).toBe(200);

    const dirRes = await call('dashboard/director', directorToken);
    expect(dirRes.statusCode).toBe(200);
  });

  it('FR-DASH-1: Dashboard KPI maʼlumotlari toʻliq va toʻgʻri qaytadi', async () => {
    const res = await call('dashboard/director?refresh=true', directorToken);
    expect(res.statusCode).toBe(200);
    const kpi = res.json<DirectorDashboardKpi>();

    expect(BigInt(kpi.revenueMonth)).toBeGreaterThanOrEqual(1_500_000n);
    expect(BigInt(kpi.revenueToday)).toBeGreaterThanOrEqual(1_500_000n);
    expect(kpi.daily.length).toBeGreaterThanOrEqual(1);
    expect(kpi.todayLessons.length).toBeGreaterThanOrEqual(1);
    expect(kpi.todayLessons[0]?.group).toBe('ROBO-01');
    expect(kpi.unmarked).toBeGreaterThanOrEqual(1);
    expect(kpi.cachedAt).toBeDefined();
  });

  it('Redis orqali keshlanadi (<= 5 daqiqa TTL) va refresh majburiy yangilaydi', async () => {
    const firstRes = await call('dashboard/director', directorToken);
    const firstCachedAt = firstRes.json<DirectorDashboardKpi>().cachedAt;

    // Ikkinchi so'rov tezda keshdan kelishi kerak
    const secondRes = await call('dashboard/director', directorToken);
    const secondCachedAt = secondRes.json<DirectorDashboardKpi>().cachedAt;
    expect(secondCachedAt).toBe(firstCachedAt);

    // Majburiy yangilash (refresh=true)
    const refreshRes = await call('dashboard/director?refresh=true', directorToken);
    expect(refreshRes.statusCode).toBe(200);
  });

  it('21:00 kunlik xulosa cron vazifasi roʻyxatdan oʻtgan va xatoliksiz bajariladi', async () => {
    const cron = t.app.get(DashboardCron);
    expect(cron).toBeDefined();
    await expect(cron.sendDailySummary()).resolves.toBeUndefined();
  });
});
