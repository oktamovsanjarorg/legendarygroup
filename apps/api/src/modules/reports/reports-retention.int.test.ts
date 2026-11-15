import { DEFAULT_BRANCH_ID } from '@lg/contracts';
import {
  attendance,
  closeDb,
  courses,
  createDb,
  type Database,
  enrollments,
  grades,
  groups,
  groupTeachers,
  lessons,
  seed,
  students,
} from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { addMonths, cohortRetention, monthEnd, teacherPerformance } from './reports-retention.js';

/** Hisobotlarda qattiq yozilgan (soxta) ko'rsatkichlar yo'q: hammasi ma'lumotdan. */
let t: TestApp;
let db: Database;
let teacherId = '';

const student = async (name: string) => {
  const [s] = await db
    .insert(students)
    .values({ branchId: DEFAULT_BRANCH_ID, fullName: name, searchName: name.toLowerCase() })
    .returning();
  return s!.id;
};

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  teacherId = await createUserWithRole(db, 'teacher');
  const [course] = await db
    .insert(courses)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      name: 'K',
      defaultMonthlyPrice: 1n,
      lessonDurationMin: 60,
    })
    .returning();
  const [group] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: course!.id,
      name: 'R-1',
      monthlyPrice: 1n,
      maxStudents: 10,
      startDate: '2026-08-01',
      gradingConfig: { scale: '0_100', kinds: ['homework'] },
    })
    .returning();
  const g = group!.id;
  await db
    .insert(groupTeachers)
    .values({ groupId: g, teacherId, role: 'main', fromDate: '2026-08-01' });
  const [a, b, c, d] = await Promise.all(['A', 'B', 'C', 'D'].map((n) => student(`Oʻquvchi ${n}`)));
  // Avgust kohortasi: 4 kishi; B — sentyabrda, C — oktyabrda ketdi.
  await db.insert(enrollments).values([
    { groupId: g, studentId: a!, startDate: '2026-08-05' },
    {
      groupId: g,
      studentId: b!,
      startDate: '2026-08-05',
      endDate: '2026-09-10',
      endReason: 'left',
    },
    {
      groupId: g,
      studentId: c!,
      startDate: '2026-08-05',
      endDate: '2026-10-20',
      endReason: 'left',
    },
    { groupId: g, studentId: d!, startDate: '2026-08-05' },
  ]);
  const [lesson] = await db
    .insert(lessons)
    .values({ groupId: g, date: '2026-11-02', startTime: '10:00', endTime: '11:00', teacherId })
    .returning();
  const l = lesson!.id;
  await db.insert(attendance).values([
    { lessonId: l, studentId: a!, status: 'present', markedBy: teacherId },
    { lessonId: l, studentId: d!, status: 'late', lateMinutes: 10, markedBy: teacherId },
  ]);
  await db.insert(grades).values([
    { lessonId: l, studentId: a!, kind: 'homework', value: 90, createdBy: teacherId },
    { lessonId: l, studentId: d!, kind: 'homework', value: 70, createdBy: teacherId },
  ]);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('FR-DASH-2: kohorta va ustoz samaradorligi — haqiqiy maʼlumot', () => {
  it('oy yordamchilari: yil oʻtishi, oy oxiri, joriy oy — bugun', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(monthEnd('2026-02', '2026-11-15')).toBe('2026-02-28');
    expect(monthEnd('2026-11', '2026-11-15')).toBe('2026-11-15');
  });

  it('kohorta: oy oxiridagi faol oʻquvchilar; kelajak oylari yoʻq', async () => {
    const [aug] = await cohortRetention(db, DEFAULT_BRANCH_ID, 6, '2026-11-15');
    expect(aug?.cohortMonth).toBe('2026-08');
    expect(aug?.initialCount).toBe(4);
    expect(aug?.retention.map((p) => p.activeCount)).toEqual([4, 3, 2, 2]);
    const [late] = await cohortRetention(db, DEFAULT_BRANCH_ID, 6, '2026-09-15');
    expect(late?.retention.map((p) => p.monthIndex)).toEqual([0, 1]);
  });

  it('ustoz: davomat (kechikish — yarim), saqlash 2/4, oʻrtacha baho 80', async () => {
    const rows = await teacherPerformance(db, DEFAULT_BRANCH_ID);
    expect(rows.find((r) => r.teacherId === teacherId)).toMatchObject({
      groupCount: 1,
      studentCount: 2,
      attendancePercentBp: 7500,
      retentionPercentBp: 5000,
      averageGradeScoreBp: 8000,
    });
  });
});
