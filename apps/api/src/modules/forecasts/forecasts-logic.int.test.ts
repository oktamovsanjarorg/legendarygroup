import {
  type ChurnRiskResponse,
  DEFAULT_BRANCH_ID,
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
  guardians,
  invoiceLines,
  invoices,
  lessons,
  notifications,
  paymentAllocations,
  payments,
  seed,
  studentGuardians,
  students,
  users,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { addMonths, collectionRateBp, monthValue, paidRevenue } from './forecasts-history.js';
import { ForecastsCron } from './forecasts.cron.js';
import { ForecastsRepository } from './forecasts.repository.js';

// FR-DASH-3, BR-36 (T-159, Q-105): prognoz haqiqiy holatdan hisoblanadi.
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let courseId: string;
const branchId = DEFAULT_BRANCH_ID;

const get = (url: string) =>
  t.app.inject({
    method: 'GET',
    url: `/api/forecasts/${url}`,
    headers: { authorization: `Bearer ${tokens.get('director')!}` },
  });

async function group(price: bigint, status: 'active' | 'paused' = 'active'): Promise<string> {
  const [g] = await db
    .insert(groups)
    .values({
      branchId,
      courseId,
      name: `G-${price}-${status}`,
      monthlyPrice: price,
      maxStudents: 10,
      startDate: '2026-01-01',
      status,
      gradingConfig: { scale: '0_5', kinds: ['homework'] },
    })
    .returning();
  return g!.id;
}

async function student(name: string): Promise<string> {
  const [s] = await db
    .insert(students)
    .values({ branchId, fullName: name, searchName: name.toLowerCase() })
    .returning();
  return s!.id;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const [c] = await db
    .insert(courses)
    .values({ branchId, name: 'K', defaultMonthlyPrice: 1n, lessonDurationMin: 60 })
    .returning();
  courseId = c!.id;
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('FR-DASH-3: tushum prognozi', () => {
  it('chegirma (BR-18), rejadagi chiqish/kirish hisobda; toʻxtagan guruh — yoʻq', async () => {
    const [g, paused] = [await group(1_000_000n), await group(700_000n, 'paused')];
    const s = await student('A');
    await db.insert(enrollments).values([
      { groupId: g, studentId: s, startDate: '2026-01-01', discountPercent: 20 },
      { groupId: paused, studentId: s, startDate: '2026-01-01' },
      {
        groupId: g,
        studentId: await student('B'),
        startDate: '2026-01-01',
        endDate: '2026-12-10',
        endReason: 'left',
      },
      { groupId: g, studentId: await student('C'), startDate: '2027-01-05' },
    ]);
    expect(await monthValue(db, branchId, '2026-12')).toEqual({
      count: 2,
      totalValue: 1_800_000n,
    });
    expect(await monthValue(db, branchId, '2027-01')).toEqual({
      count: 2,
      totalValue: 1_800_000n,
    });
    expect(await monthValue(db, branchId, '2027-02')).toMatchObject({ count: 2 });
    const body = (await get('revenue')).json<RevenueForecastResponse>();
    expect(body.items).toHaveLength(3);
  });

  it('yigʻilish: oldingi 6 oy hisoblarining toʻlangan ulushi; void va storno sanalmaydi', async () => {
    const s = await student('D');
    const bill = async (period: string, total: bigint, status: 'open' | 'void' = 'open') => {
      const [inv] = await db
        .insert(invoices)
        .values({ branchId, studentId: s, period, dueDate: `${period}-10`, total, status })
        .returning();
      const [line] = await db
        .insert(invoiceLines)
        .values({ invoiceId: inv!.id, kind: 'tuition', amount: total, description: period })
        .returning();
      return line!.id;
    };
    const paid = await bill('2025-03', 400_000n);
    await bill('2025-04', 400_000n);
    await bill('2025-05', 999_000n, 'void');
    const pay = async (amount: bigint, reversalOf?: string) => {
      const [p] = await db
        .insert(payments)
        .values({
          branchId,
          studentId: s,
          amount,
          method: 'cash',
          paidAt: new Date('2025-03-05T07:00:00Z'),
          reversalOf: reversalOf ?? null,
        })
        .returning();
      return p!.id;
    };
    const p = await pay(400_000n);
    await db
      .insert(paymentAllocations)
      .values({ paymentId: p, invoiceLineId: paid, amount: 400_000n });
    expect(await collectionRateBp(db, branchId, '2025-06')).toBe(5000);
    expect(await collectionRateBp(db, branchId, '2024-01')).toBe(9000); // tarix yo'q
    await pay(-400_000n, p);
    expect(await collectionRateBp(db, branchId, '2025-06')).toBe(0);
    expect(await paidRevenue(db, branchId, '2025-03-01', '2025-04-01')).toBe(0n);
    expect(addMonths('2025-01', -6)).toBe('2024-07');
  });
});

describe('BR-36: ketish xavfi', () => {
  it('ikki guruhdagi oʻquvchi — bitta qator; yopilgan hisob kechikish emas; yetib boʻlmaydigan ota-ona', async () => {
    const s = await student('Ikki Guruh');
    const [g1, g2] = [await group(1n), await group(2n)];
    await db.insert(enrollments).values([
      { groupId: g1, studentId: s, startDate: '2026-01-01' },
      { groupId: g2, studentId: s, startDate: '2026-01-01' },
    ]);
    const [inv] = await db
      .insert(invoices)
      .values({
        branchId,
        studentId: s,
        period: '2026-02',
        dueDate: '2026-02-10',
        total: 0n,
        status: 'open',
      })
      .returning();
    expect(inv).toBeDefined();
    const find = async () =>
      (await get('churn')).json<ChurnRiskResponse>().items.filter((i) => i.studentId === s);
    const [row, ...rest] = await find();
    expect(rest).toEqual([]);
    expect(row?.groupName).toContain(', ');
    const score = (f: string) => row?.factors.find((x) => x.factor === f)?.score;
    expect([score('payment_delay'), score('bot_unresponsive')]).toEqual([0, 10]);

    const userId = await createUserWithRole(db, 'guardian');
    await db.update(users).set({ telegramId: 990_022n }).where(eq(users.id, userId));
    const [gu] = await db
      .insert(guardians)
      .values({ branchId, userId, fullName: 'Ota', phone: '+998901010101' })
      .returning();
    await db
      .insert(studentGuardians)
      .values({ studentId: s, guardianId: gu!.id, relation: 'father' });
    expect((await find())[0]?.factors.at(-1)?.score).toBe(0);
    await db.insert(notifications).values({
      branchId,
      userId,
      type: 'announcement',
      recipient: '990022',
      body: 'x',
      status: 'blocked',
    });
    expect((await find())[0]?.factors.at(-1)?.score).toBe(10);
  });

  it('ketganlar soni: koʻchgan va tugatgan sanalmaydi', async () => {
    const g = await group(3n);
    const end = (endReason: 'left' | 'transferred' | 'finished', studentId: string) => ({
      groupId: g,
      studentId,
      startDate: '2025-01-01',
      endDate: '2025-07-10',
      endReason,
    });
    await db
      .insert(enrollments)
      .values([
        end('left', await student('E')),
        end('transferred', await student('F')),
        end('finished', await student('H')),
      ]);
    const repo = t.app.get(ForecastsRepository);
    expect(await repo.getActualChurnCount(branchId, '2025-07-01', '2025-08-01')).toBe(1);
  });

  it('haftalik xulosa botga: xavflilar bor — bitta xabar; qayta ishlasa takrorlanmaydi', async () => {
    const s = await student('Xavfli Bola');
    const groupId = await group(4n);
    await db.insert(enrollments).values({ groupId, studentId: s, startDate: '2026-01-01' });
    const [inv] = await db
      .insert(invoices)
      .values({
        branchId,
        studentId: s,
        period: '2026-03',
        dueDate: '2026-03-10',
        total: 500_000n,
        status: 'open',
      })
      .returning();
    expect(inv).toBeDefined();
    const managerId = await createUserWithRole(db, 'director');
    await db.update(users).set({ telegramId: 990_033n }).where(eq(users.id, managerId));
    const cron = t.app.get(ForecastsCron);
    const repo = t.app.get(ForecastsRepository);
    const inputs = await repo.getStudentsChurnInputs(branchId, '2026-11-24');
    expect(inputs.find((i) => i.studentId === s)?.paymentDelayDays).toBeGreaterThan(30);

    const sent = () => db.select().from(notifications).where(eq(notifications.userId, managerId));
    // To'lov (30) + ota-ona (10) = 40 < 60: xavfli emas — bezovta qilinmaydi.
    await cron.generateWeeklySummary();
    expect(await sent()).toEqual([]);

    const teacherId = await createUserWithRole(db, 'teacher');
    const date = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const [lesson] = await db
      .insert(lessons)
      .values({ groupId, teacherId, date, startTime: '10:00', endTime: '11:00', status: 'done' })
      .returning();
    await db
      .insert(attendance)
      .values({ lessonId: lesson!.id, studentId: s, status: 'absent', markedBy: teacherId });
    await cron.generateWeeklySummary();
    await cron.generateWeeklySummary();
    const [msg, ...rest] = await sent();
    expect(rest).toEqual([]);
    expect(msg?.body).toContain('Xavfli Bola — 80');
  });
});
