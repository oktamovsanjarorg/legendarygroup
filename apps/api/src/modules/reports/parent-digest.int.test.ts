import { DEFAULT_BRANCH_ID, type ParentDigestReport, type RoleCode } from '@lg/contracts';
import {
  closeDb,
  courses,
  createDb,
  type Database,
  enrollments,
  groups,
  guardians,
  notifications,
  seed,
  studentGuardians,
  students,
} from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { isMonthEnd } from './parent-digest.service.js';

// T-304 review: kimga yuboriladi, qaysi guruh reytingi, haftalik davr.
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
const today = formatDateToYmd(new Date());

const call = (url: string, token: string, method: 'GET' | 'POST' = 'GET') =>
  t.app.inject({ method, url: `/api/${url}`, headers: { authorization: `Bearer ${token}` } });

async function group(name: string): Promise<string> {
  const [c] = await db
    .insert(courses)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      name,
      defaultMonthlyPrice: 1000n,
      lessonDurationMin: 60,
    })
    .returning();
  const [g] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: c!.id,
      name,
      monthlyPrice: 1000n,
      maxStudents: 10,
      startDate: addDays(today, -400),
      gradingConfig: { scale: '0_5', kinds: ['homework'] },
    })
    .returning();
  return g!.id;
}

async function child(name: string, phone: string, archived = false) {
  const [s] = await db
    .insert(students)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      fullName: name,
      searchName: name.toLowerCase(),
      ...(archived ? { archivedAt: new Date() } : {}),
    })
    .returning();
  const userId = await createUserWithRole(db, 'guardian', phone);
  const [gd] = await db
    .insert(guardians)
    .values({ branchId: DEFAULT_BRANCH_ID, userId, fullName: `Ota ${name}`, phone })
    .returning();
  await db
    .insert(studentGuardians)
    .values({ studentId: s!.id, guardianId: gd!.id, relation: 'father' });
  return { studentId: s!.id, userId };
}

let active: { studentId: string; userId: string };
let left: { studentId: string; userId: string };

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const [oldGroup, current] = [await group('Eski guruh'), await group('Joriy guruh')];
  active = await child('Aziz Faol', '+998905550001');
  left = await child('Bobur Ketgan', '+998905550002', true);
  const other = await child('Jasur Sinfdosh', '+998905550003');
  await db.insert(enrollments).values([
    // Eski guruh — tugagan (1 kishi); joriy — 2 kishi.
    {
      groupId: oldGroup,
      studentId: active.studentId,
      startDate: addDays(today, -300),
      endDate: addDays(today, -100),
      endReason: 'transferred',
    },
    { groupId: current, studentId: active.studentId, startDate: addDays(today, -99) },
    { groupId: current, studentId: other.studentId, startDate: addDays(today, -99) },
    {
      groupId: current,
      studentId: left.studentId,
      startDate: addDays(today, -99),
      endDate: addDays(today, -10),
      endReason: 'left',
    },
  ]);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-304 review: ota-ona hisobotlari (FR-RPT-2, 3)', () => {
  it('arxivlangan (ketgan) oʻquvchining ota-onasiga hisobot yuborilmaydi', async () => {
    const res = await call(
      'reports/parent-digest/dispatch?period=weekly',
      tokens.get('director')!,
      'POST',
    );
    expect(res.statusCode).toBe(201);
    const sent = (userId: string) =>
      db
        .select()
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), eq(notifications.type, 'weekly_parent_report')),
        );
    expect(await sent(active.userId)).toHaveLength(1);
    expect(await sent(left.userId)).toHaveLength(0);
  });

  it('reyting — joriy guruhdan (tugagan eski guruhdan emas); haftalik davr — 7 kun', async () => {
    const director = tokens.get('director')!;
    const parent = await tokenFor(t, db, active.userId, 'guardian');
    expect(director).toBeTruthy();
    const r = (
      await call(
        `reports/parent-digest/preview?studentId=${active.studentId}&period=weekly`,
        parent,
      )
    ).json<ParentDigestReport>();
    expect(r.totalStudents).toBe(2);
    expect(r.periodFrom).toBe(addDays(today, -6));
    expect(r.periodTo).toBe(today);
  });

  it('oylik hisobot faqat oyning oxirgi kunida (28-sanada emas)', () => {
    expect(isMonthEnd('2026-11-28')).toBe(false);
    expect(isMonthEnd('2026-11-30')).toBe(true);
    expect(isMonthEnd('2026-02-28')).toBe(true);
    expect(isMonthEnd('2028-02-28')).toBe(false);
    expect(isMonthEnd('2026-12-31')).toBe(true);
  });
});
