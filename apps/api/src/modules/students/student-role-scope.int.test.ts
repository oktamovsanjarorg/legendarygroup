import type { RoleCode, StudentAccessCodeResult } from '@lg/contracts';
import { closeDb, createDb, type Database, lessons, seed, students, teacherComments } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

/**
 * T-126 D4: oʻquvchi faqat oʻzini koʻradi — sinfdoshlar roʻyxati, guruh reytingi (boshqalarning
 * ismi va ballari) va ustozning ichki izohlari yopiq. Oʻz progressi va oʻrni ochiq.
 */
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentToken: string;
let ownId: string;
let mateId: string;
let groupId: string;
let lessonId: string;

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

const idOf = (r: { json: <T>() => T }) => r.json<{ id: string }>().id;

async function setupGroup(admin: string, teacherId: string): Promise<void> {
  const courseId = idOf(
    await call('POST', 'courses', admin, {
      name: 'Kimyo',
      defaultMonthlyPrice: '500000',
      lessonDurationMin: 60,
    }),
  );
  const roomId = idOf(await call('POST', 'rooms', admin, { name: 'Xona S', capacity: 10 }));
  groupId = idOf(
    await call('POST', 'groups', admin, {
      courseId,
      roomId,
      name: 'CHEM-1',
      maxStudents: 10,
      startDate: '2026-11-01',
      monthlyPrice: '500000',
      gradingConfig: { scale: '0_5', kinds: ['homework'] },
      teachers: [{ teacherId, role: 'main' }],
    }),
  );
  const [l] = await db
    .insert(lessons)
    .values({
      groupId,
      date: '2026-11-13',
      startTime: '10:00',
      endTime: '11:00',
      roomId,
      teacherId,
      status: 'scheduled',
    })
    .returning();
  lessonId = l!.id;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const admin = tokens.get('admin')!;
  const teacherId = await createUserWithRole(db, 'teacher');
  await setupGroup(admin, teacherId);

  ownId = idOf(
    await call('POST', 'students', admin, { fullName: 'Oʻz Bola', phone: '+998931110001' }),
  );
  mateId = idOf(
    await call('POST', 'students', admin, { fullName: 'Sinfdosh Bola', phone: '+998931110002' }),
  );
  for (const studentId of [ownId, mateId]) {
    await call('POST', 'enrollments', admin, { studentId, groupId, startDate: '2026-11-01' });
  }
  await db.insert(teacherComments).values([
    {
      studentId: ownId,
      groupId,
      lessonId,
      text: 'Ochiq izoh',
      visibility: 'guardian',
      createdBy: teacherId,
    },
    {
      studentId: ownId,
      groupId,
      lessonId,
      text: 'Ichki eslatma',
      visibility: 'internal',
      createdBy: teacherId,
    },
  ]);

  const code = (
    await call('POST', `students/${ownId}/access-code`, admin)
  ).json<StudentAccessCodeResult>().code;
  const link = await t.app.inject({
    method: 'POST',
    url: '/internal/student/link',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN,
    },
    payload: { telegramId: '7712340001', phone: '+998931110001', code },
  });
  expect(link.json<{ result: string }>().result).toBe('linked');
  const [row] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, ownId));
  studentToken = await tokenFor(t, db, row!.userId!, 'student');
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-126 D4: oʻquvchi roli — faqat oʻzi', () => {
  it('ustozning ichki izohi oʻquvchiga koʻrinmaydi (faqat `guardian` izohlar)', async () => {
    const res = await call('GET', `grades/history?studentId=${ownId}`, studentToken);
    expect(res.statusCode).toBe(200);
    const texts = res.json<{ comments: { text: string }[] }>().comments.map((c) => c.text);
    expect(texts).toContain('Ochiq izoh');
    expect(texts).not.toContain('Ichki eslatma');
  });

  it.each([
    ['guruh reytingi (boshqalarning ismi/ballari)', () => `grades/groups/${groupId}/leaderboard`],
    ['guruh roʻyxati', () => `groups/${groupId}/students`],
    ['dars roʻyxati', () => `lessons/${lessonId}/students`],
    ['dars baholari', () => `grades/lessons/${lessonId}`],
    ['guruh kartasi', () => `groups/${groupId}`],
    ['ustozlar katalogi', () => 'teachers'],
    ['direktor paneli', () => 'dashboard/director'],
  ])('forbidden: %s', async (_name, url) => {
    expect((await call('GET', url(), studentToken)).statusCode).toBe(403);
  });

  it('sinfdoshning kartasi, progressi va davomati — 404', async () => {
    for (const url of [
      `students/${mateId}`,
      `grades/students/${mateId}/progress`,
      `attendance/history?studentId=${mateId}`,
      `tests/student/${mateId}`,
    ]) {
      expect((await call('GET', url, studentToken)).statusCode, url).toBe(404);
    }
  });

  it('oʻz progressi va guruhdagi oʻrni ochiq', async () => {
    const res = await call('GET', `grades/students/${ownId}/progress`, studentToken);
    expect(res.statusCode).toBe(200);
    expect(res.json<{ totalStudents: number | null }>().totalStudents).toBe(2);
  });

  it('ota-ona: begona guruh reytingi — 403 (oldingi teshik)', async () => {
    const res = await call('GET', `grades/groups/${groupId}/leaderboard`, tokens.get('guardian')!);
    expect(res.statusCode).toBe(403);
  });
});
