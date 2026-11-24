import type { EventPayloads, RoleCode } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  invoiceLines,
  invoices,
  outboxEvents,
  seed,
} from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { EventHandlers } from '../outbox/index.js';
import { BillingGeneratorService } from './billing-generator.service.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
const g = { a: '', b: '' };
const today = formatDateToYmd(new Date());
const period = today.slice(0, 7);

let key = 0;
const call = (url: string, payload?: object, role: RoleCode = 'admin', method = 'POST') =>
  t.app.inject({
    method: method as 'POST',
    url: `/api/${url}`,
    ...(payload ? { payload } : {}),
    headers: {
      authorization: `Bearer ${tokens.get(role) ?? ''}`,
      'idempotency-key': `eb-${process.pid}-${++key}`,
    },
  });
const idOf = async (url: string, body: object) => (await call(url, body)).json<{ id: string }>().id;

/** Worker o'rniga: shu a'zolik event'ini (ikki marta — qayta yetkazish) iste'mol qilish. */
const deliver = async (enrollmentId: string) => {
  const rows = await db
    .select()
    .from(outboxEvents)
    .where(eq(outboxEvents.type, 'EnrollmentCreated'));
  const ev = rows.find(
    (r) => (r.payload as { enrollmentId: string }).enrollmentId === enrollmentId,
  );
  if (!ev) throw new Error('EnrollmentCreated yoʻq');
  for (const _ of [1, 2])
    await t.app.get(EventHandlers).dispatch({
      eventId: ev.id,
      type: 'EnrollmentCreated',
      payload: ev.payload as EventPayloads['EnrollmentCreated'],
      occurredAt: new Date().toISOString(),
    });
};
const invoiceOf = async (studentId: string) => {
  const [inv] = await db.select().from(invoices).where(eq(invoices.studentId, studentId));
  if (!inv) return null;
  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id));
  return { period: inv.period, total: inv.total, lines: lines.map((l) => l.amount).sort() };
};

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const course = await idOf('courses', {
    name: 'Hisob kursi',
    defaultMonthlyPrice: '600000',
    lessonDurationMin: 90,
  });
  g.a = await idOf('groups', { courseId: course, name: 'H-1', maxStudents: 20, startDate: today });
  g.b = await idOf('groups', {
    courseId: course,
    name: 'H-2',
    maxStudents: 20,
    startDate: today,
    monthlyPrice: '400000',
  });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Q-95: guruhga yozilganda joriy oy hisobi (BR-3, BR-6)', () => {
  it('guruh ochilishidan oldin kelgan — yoziladi, joriy oy toʻliq; takroriy event — bitta qator', async () => {
    const s = await idOf('students', { fullName: 'Hisob Testov' });
    const res = await call('enrollments', {
      studentId: s,
      groupId: g.a,
      startDate: addDays(today, -40),
    });
    expect(res.statusCode).toBe(201);
    await deliver(res.json<{ id: string }>().id);
    expect(await invoiceOf(s)).toEqual({ period, total: 600000n, lines: [600000n] });
  });

  it('ikkinchi guruh — oʻsha oy hisobiga yangi qator, jami oshadi', async () => {
    const s = await idOf('students', { fullName: 'Ikki Guruh' });
    const start = `${period}-01`;
    await deliver(await idOf('enrollments', { studentId: s, groupId: g.a, startDate: start }));
    await deliver(await idOf('enrollments', { studentId: s, groupId: g.b, startDate: start }));
    expect(await invoiceOf(s)).toEqual({ period, total: 1000000n, lines: [400000n, 600000n] });
  });

  it('keyingi oydan boshlanadi — hozir hisob yoʻq (1-sanada generator)', async () => {
    const s = await idOf('students', { fullName: 'Kelajak Hisob' });
    const next = addDays(`${period}-01`, 40).slice(0, 7);
    await deliver(
      await idOf('enrollments', { studentId: s, groupId: g.a, startDate: `${next}-01` }),
    );
    expect(await invoiceOf(s)).toBeNull();
  });
});

describe('Q-96: xato yozilgan aʼzolikni olib tashlash', () => {
  const setup = async (name: string) => {
    const s = await idOf('students', { fullName: name });
    const e = await idOf('enrollments', { studentId: s, groupId: g.a, startDate: `${period}-01` });
    await deliver(e);
    return { s, e };
  };
  const remove = (e: string, role: RoleCode = 'admin') =>
    call(`billing/enrollments/${e}`, undefined, role, 'DELETE');

  it('toʻlovsiz — aʼzolik va hisob yoʻqoladi (void), qarz 0', async () => {
    const { s, e } = await setup('Xato Kiritilgan');
    expect((await remove(e)).statusCode).toBe(204);
    const [inv] = await db.select().from(invoices).where(eq(invoices.studentId, s));
    expect([inv?.total, inv?.status]).toEqual([0n, 'void']);
    const res = await call(`students/${s}/enrollments`, undefined, 'admin', 'GET');
    expect(res.json<unknown[]>()).toEqual([]);
  });

  it('BR-12: xato guruhdan olib, shu oyda toʻgʻrisiga yozilsa — hisob ochiq, toʻlov taqsimlanadi', async () => {
    const { s, e } = await setup('Qayta Yozilgan');
    expect((await remove(e)).statusCode).toBe(204);
    const start = `${period}-01`;
    await deliver(await idOf('enrollments', { studentId: s, groupId: g.b, startDate: start }));
    const [inv] = await db.select().from(invoices).where(eq(invoices.studentId, s));
    expect([inv?.total, inv?.status]).toEqual([400000n, 'open']);
    await call('billing/payments', { studentId: s, amount: '400000', method: 'cash' });
    const [paid] = await db.select().from(invoices).where(eq(invoices.studentId, s));
    expect(paid?.status).toBe('paid');
  });

  it('toʻlov tegsa — 409 ENROLLMENT_HAS_PAYMENTS; oʻqituvchi — 403', async () => {
    const { s, e } = await setup('Toʻlagan Bola');
    const pay = await call('billing/payments', { studentId: s, amount: '100000', method: 'cash' });
    expect(pay.statusCode).toBe(201);
    const res = await remove(e);
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([
      409,
      'ENROLLMENT_HAS_PAYMENTS',
    ]);
    expect((await remove(e, 'teacher')).statusCode).toBe(403);
  });
});

it('Q-103/BR-4: oy oʻrtasiga rejalangan koʻchirish — oy faqat eski guruhda hisoblanadi', async () => {
  const s = await idOf('students', { fullName: 'Koʻchgan Testov' });
  const e = await idOf('enrollments', { studentId: s, groupId: g.a, startDate: today });
  const next = addDays(`${period}-28`, 7).slice(0, 7);
  const moved = await call(`enrollments/${e}/transfer`, { toGroupId: g.b, date: `${next}-15` });
  expect(moved.statusCode, moved.body).toBe(200);
  await t.app.get(BillingGeneratorService).generateMonthlyInvoices(next);
  const rows = await db
    .select({ enrollmentId: invoiceLines.enrollmentId, amount: invoiceLines.amount })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
    .where(and(eq(invoices.studentId, s), eq(invoices.period, next)));
  expect(rows).toEqual([{ enrollmentId: e, amount: 600_000n }]);
});
