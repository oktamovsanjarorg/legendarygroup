import type { RoleCode } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  enrollments,
  invoiceLines,
  invoices,
  lessons,
  seed,
} from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dispatchEvents } from '../../test/dispatch-event.js';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { BillingGeneratorService } from './billing-generator.service.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let course = '';
const today = formatDateToYmd(new Date());
const period = today.slice(0, 7);
const next = addDays(`${period}-28`, 4).slice(0, 7);

const call = (method: 'POST' | 'GET', url: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get('admin')!}` },
  });
const idOf = async (url: string, body: object) =>
  (await call('POST', url, body)).json<{ id: string }>().id;

/** Har kuni dars bo'ladigan faol guruh va bitta a'zo (joriy oy hisobi yozilgan). */
async function activeGroup(name: string) {
  const groupId = await idOf('groups', {
    name,
    courseId: course,
    maxStudents: 10,
    startDate: `${period}-01`,
    slots: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      startTime: '10:00',
      endTime: '11:00',
    })),
  });
  await call('POST', `groups/${groupId}/status`, { status: 'active' });
  const studentId = await idOf('students', { fullName: `${name} Oʻquvchi` });
  const enrollmentId = await idOf('enrollments', {
    studentId,
    groupId,
    startDate: `${period}-01`,
  });
  await dispatchEvents(t, db, 'EnrollmentCreated');
  return { groupId, studentId, enrollmentId };
}
const periodsOf = async (studentId: string) =>
  (await db.select().from(invoices).where(eq(invoices.studentId, studentId)))
    .map((i) => i.period)
    .sort();
const generate = (p: string) => t.app.get(BillingGeneratorService).generateMonthlyInvoices(p);
const setStatus = (id: string, status: string) => call('POST', `groups/${id}/status`, { status });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  course = await idOf('courses', {
    name: 'Holat kursi',
    defaultMonthlyPrice: '600000',
    lessonDurationMin: 60,
  });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Q-102: guruh holati va hisob', () => {
  it('yakunlangan guruh: aʼzolik yopiladi, keyingi oy hisob yozilmaydi', async () => {
    const g = await activeGroup('Yakun');
    expect((await setStatus(g.groupId, 'finished')).statusCode).toBeLessThan(300);
    await dispatchEvents(t, db, 'GroupFinished');
    const [e] = await db.select().from(enrollments).where(eq(enrollments.id, g.enrollmentId));
    expect([e?.endDate, e?.endReason]).toEqual([today, 'finished']);
    await generate(next);
    expect(await periodsOf(g.studentId)).toEqual([period]);
    // Endi arxivlash mumkin (Q-93).
    expect((await call('POST', `students/${g.studentId}/archive`)).statusCode).toBeLessThan(300);
  });

  it('toʻxtatilgan: qolgan darslar bekor (BR-5), yangi oyga hisob yoʻq', async () => {
    const g = await activeGroup('Pauza');
    await setStatus(g.groupId, 'paused');
    const cancelled = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.groupId, g.groupId), eq(lessons.status, 'cancelled')));
    const left = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.groupId, g.groupId), eq(lessons.status, 'scheduled')));
    expect(cancelled.length).toBeGreaterThan(0);
    expect(left.filter((l) => l.date > today)).toHaveLength(0);
    await generate(next);
    expect(await periodsOf(g.studentId)).toEqual([period]);
  });

  it('shu oyda davom ettirilsa: darslar qaytadi, ikkinchi hisob yozilmaydi', async () => {
    const g = await activeGroup('Qaytish');
    await setStatus(g.groupId, 'paused');
    await setStatus(g.groupId, 'active');
    await dispatchEvents(t, db, 'GroupResumed');
    const cancelled = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.groupId, g.groupId), eq(lessons.status, 'cancelled')));
    expect(cancelled).toHaveLength(0);
    expect(await periodsOf(g.studentId)).toEqual([period]);
  });

  it('toʻxtatilgan guruhga yozilgan — hisob davom ettirilganda, qolgan kunlarga (bir marta)', async () => {
    const g = await activeGroup('Kech');
    await setStatus(g.groupId, 'paused');
    const studentId = await idOf('students', { fullName: 'Pauzada Kelgan' });
    await idOf('enrollments', { studentId, groupId: g.groupId, startDate: `${period}-01` });
    await dispatchEvents(t, db, 'EnrollmentCreated');
    expect(await periodsOf(studentId)).toEqual([]);
    await setStatus(g.groupId, 'active');
    await dispatchEvents(t, db, 'GroupResumed');
    await dispatchEvents(t, db, 'GroupResumed');
    const rows = await db
      .select({ amount: invoiceLines.amount })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(eq(invoices.studentId, studentId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBeLessThanOrEqual(600_000n);
  });
});
