import type { RoleCode } from '@lg/contracts';
import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  enrollments,
  guardians,
  seed,
  studentGuardians,
  students,
} from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let groupId = '';
const today = formatDateToYmd(new Date());
const start = addDays(today, -20);

let key = 0;
const call = (method: 'GET' | 'POST' | 'DELETE', url: string, role: RoleCode, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    ...(payload ? { payload } : {}),
    headers: {
      authorization: `Bearer ${tokens.get(role) ?? ''}`,
      'idempotency-key': `sd-${process.pid}-${++key}`,
    },
  });
const idOf = async (url: string, body: object) =>
  (await call('POST', url, 'admin', body)).json<{ id: string }>().id;
const del = (id: string, role: RoleCode = 'director') => call('DELETE', `students/${id}`, role);
const codeOf = async (res: { json: <T>() => T }) => res.json<{ code: string }>().code;

/** Ota-onali, guruhda o'qib chiqib ketgan va arxivlangan o'quvchi (pul tarixi yo'q). */
async function archivedStudent(name: string) {
  const id = await idOf('students', {
    fullName: name,
    guardians: [{ fullName: 'Ona Testova', phone: '+998901112233', relation: 'mother' }],
  });
  const enr = await idOf('enrollments', { studentId: id, groupId, startDate: start });
  await call('POST', `enrollments/${enr}/end`, 'admin', { endDate: today, reason: 'left' });
  expect((await call('POST', `students/${id}/archive`, 'admin')).statusCode).toBe(200);
  return id;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const course = await idOf('courses', {
    name: 'Oʻchirish kursi',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 90,
  });
  groupId = await idOf('groups', {
    courseId: course,
    name: 'D-1',
    maxStudents: 10,
    startDate: start,
  });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('DELETE /students/:id — arxivdagi oʻquvchini oʻchirish (Q-124, FR-STU-6)', () => {
  it('Director — oʻquvchi, aʼzolik va ota-ona bogʻlanishi ketadi; ota-ona qoladi; audit', async () => {
    const id = await archivedStudent('Ochiriladigan Testov');
    const res = await del(id);
    expect(res.statusCode).toBe(204);

    expect(await db.select().from(students).where(eq(students.id, id))).toHaveLength(0);
    expect(await db.select().from(enrollments).where(eq(enrollments.studentId, id))).toHaveLength(
      0,
    );
    expect(
      await db.select().from(studentGuardians).where(eq(studentGuardians.studentId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(guardians).where(eq(guardians.phone, '+998901112233')),
    ).toHaveLength(1);
    const audit = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'student.delete'), eq(auditLogs.entityId, id)));
    expect(audit).toHaveLength(1);
    expect(audit[0]!.actorRole).toBe('director');
    expect(audit[0]!.before).toMatchObject({ fullName: 'Ochiriladigan Testov', enrollments: 1 });

    expect((await call('GET', `students/${id}`, 'director')).statusCode).toBe(404);
    expect((await del(id)).statusCode).toBe(404);
  });

  it('forbidden: Admin, Ustoz, Ota-ona — 403 (student.delete faqat Director)', async () => {
    const id = await archivedStudent('Ruxsatsiz Testov');
    for (const role of ['admin', 'teacher', 'guardian'] as const)
      expect((await del(id, role)).statusCode).toBe(403);
    expect(await db.select().from(students).where(eq(students.id, id))).toHaveLength(1);
  });

  it('arxivda boʻlmagan oʻquvchi — 409 STUDENT_NOT_ARCHIVED', async () => {
    const id = await idOf('students', { fullName: 'Faol Testov' });
    const res = await del(id);
    expect(res.statusCode).toBe(409);
    expect(await codeOf(res)).toBe('STUDENT_NOT_ARCHIVED');
  });

  it('toʻlov tarixi bor — 409 STUDENT_HAS_FINANCE, hech narsa oʻchmaydi', async () => {
    const id = await idOf('students', { fullName: 'Tolovli Testov' });
    const pay = await call('POST', 'billing/payments', 'admin', {
      studentId: id,
      amount: '100000',
      method: 'cash',
    });
    expect(pay.statusCode).toBe(201);
    expect((await call('POST', `students/${id}/archive`, 'admin')).statusCode).toBe(200);
    const res = await del(id);
    expect(res.statusCode).toBe(409);
    expect(await codeOf(res)).toBe('STUDENT_HAS_FINANCE');
    expect(await db.select().from(students).where(eq(students.id, id))).toHaveLength(1);
  });

  it('notoʻgʻri id — 400, mavjud boʻlmagan — 404', async () => {
    expect((await call('DELETE', 'students/abc', 'director')).statusCode).toBe(400);
    expect((await del('01900000-0000-7000-8000-00000000dead')).statusCode).toBe(404);
  });
});
