import type { PayrollRunDetail, RoleCode } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  invoiceLines,
  invoices,
  lessons,
  paymentAllocations,
  payments,
  seed,
  teacherAdvances,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

// agy kodi tekshiruvi: holat o'tishlari, qayta generatsiya, storno va shartnoma muddati.
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let teacherId: string;
let adminUserId: string;
let lineId: string;
let studentId: string;

const PERIOD = '2026-10';

const call = (method: 'GET' | 'POST', url: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get('director')!}` },
  });

const generate = async (): Promise<PayrollRunDetail> => {
  const res = await call('POST', 'payroll/runs/generate', { period: PERIOD });
  expect(res.statusCode).toBe(201);
  return res.json<PayrollRunDetail>();
};

const teacherNet = (run: PayrollRunDetail): bigint =>
  BigInt(run.teachers.find((x) => x.teacherId === teacherId)?.totalNet ?? '0');

const kinds = (run: PayrollRunDetail): string[] =>
  (run.teachers.find((x) => x.teacherId === teacherId)?.items ?? []).map((i) => i.kind).sort();

async function seedGroupWithPaidStudent(adminToken: string): Promise<void> {
  const post = (url: string, payload: object) =>
    t.app.inject({
      method: 'POST',
      url: `/api/${url}`,
      payload,
      headers: { authorization: `Bearer ${adminToken}` },
    });
  const course = await post('courses', {
    name: 'Fizika',
    defaultMonthlyPrice: '400000',
    lessonDurationMin: 60,
  });
  const room = await post('rooms', { name: 'Xona 7', capacity: 10 });
  const roomId = room.json<{ id: string }>().id;
  const group = await post('groups', {
    courseId: course.json<{ id: string }>().id,
    roomId,
    name: 'FIZ-01',
    maxStudents: 10,
    startDate: '2026-10-01',
    monthlyPrice: '400000',
    teachers: [{ teacherId, role: 'main' }],
  });
  const groupId = group.json<{ id: string }>().id;
  await db.insert(lessons).values({
    groupId,
    date: '2026-10-05',
    startTime: '10:00',
    endTime: '11:00',
    roomId,
    teacherId,
    isSubstitute: false,
    status: 'done',
  });
  const student = await post('students', {
    fullName: 'Rasulov Aziz',
    birthDate: '2011-02-03',
    gender: 'male',
  });
  studentId = student.json<{ id: string }>().id;
  const enr = await post('enrollments', { studentId, groupId, startDate: '2026-10-01' });
  const [inv] = await db
    .insert(invoices)
    .values({ studentId, period: PERIOD, dueDate: '2026-10-10', total: 400_000n, status: 'paid' })
    .returning();
  const [line] = await db
    .insert(invoiceLines)
    .values({
      invoiceId: inv!.id,
      enrollmentId: enr.json<{ id: string }>().id,
      kind: 'tuition',
      amount: 400_000n,
      description: 'Oktabr',
    })
    .returning();
  lineId = line!.id;
}

async function addPayment(amount: bigint, key: string, reversalOf?: string): Promise<string> {
  const [pay] = await db
    .insert(payments)
    .values({
      studentId,
      amount: reversalOf ? -amount : amount,
      method: 'cash',
      paidAt: new Date('2026-10-06T07:00:00Z'),
      receivedBy: adminUserId,
      idempotencyKey: key,
      reversalOf: reversalOf ?? null,
    })
    .returning();
  if (!reversalOf) {
    await db
      .insert(paymentAllocations)
      .values({ paymentId: pay!.id, invoiceLineId: lineId, amount });
  }
  return pay!.id;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  adminUserId = await createUserWithRole(db, 'admin', '+998907770011');
  teacherId = await createUserWithRole(db, 'teacher', '+998907770022');
  await seedGroupWithPaidStudent(tokens.get('admin')!);

  // Muddati o'tgan eski shartnoma — ishlatilmasligi kerak
  await call('POST', 'payroll/contracts', {
    teacherId,
    type: 'fixed',
    fixedAmount: '9000000',
    validFrom: '2026-01-01',
    validTo: '2026-06-30',
  });
  const res = await call('POST', 'payroll/contracts', {
    teacherId,
    type: 'percent',
    percentBp: 5000,
    base: 'collected',
    validFrom: '2026-07-01',
  });
  expect(res.statusCode).toBe(201);
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('BR-23…BR-28: oylik hisobining yaxlitligi', () => {
  it('BR-23: muddati tugagan shartnoma hisobga olinmaydi; BR-24: storno qilingan toʻlov foiz bazasida yoʻq', async () => {
    const kept = await addPayment(200_000n, 'pi-keep');
    const reversed = await addPayment(200_000n, 'pi-rev');
    await addPayment(200_000n, 'pi-rev-storno', reversed);
    expect(kept).toBeDefined();

    const run = await generate();
    expect(kinds(run)).toEqual(['percent']);
    expect(teacherNet(run)).toBe(100_000n); // 50% × 200 000 (storno qilingan 200 000 yo'q)
  });

  it('BR-26/BR-28: qayta generatsiya qoʻlda kiritilgan bonusni va avans ushlanmasini saqlaydi', async () => {
    await db.insert(teacherAdvances).values({
      teacherId,
      branchId: (await generate()).branchId,
      amount: 30_000n,
      givenAt: '2026-10-20',
      createdBy: adminUserId,
    });
    const first = await generate();
    const bonus = await call('POST', `payroll/runs/${first.id}/adjustments`, {
      teacherId,
      kind: 'bonus',
      amount: '50000',
      note: 'Natija uchun',
    });
    expect(bonus.statusCode).toBe(201);

    const again = await generate();
    expect(kinds(again)).toEqual(['advance', 'bonus', 'percent']);
    expect(teacherNet(again)).toBe(100_000n + 50_000n - 30_000n);
    expect(BigInt(again.totalAmount)).toBe(120_000n);
    const [adv] = await db
      .select()
      .from(teacherAdvances)
      .where(eq(teacherAdvances.teacherId, teacherId));
    expect(adv?.deductedInRunId).toBe(again.id);
  });

  it('BR-27: DRAFT holatidagi hisob toʻlangan deb belgilanmaydi', async () => {
    const run = await generate();
    const res = await call('POST', `payroll/runs/${run.id}/pay`, {});
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe('PAYROLL_NOT_APPROVED');
  });

  it('BR-27: parallel tasdiqlash — faqat bittasi oʻtadi', async () => {
    const run = await generate();
    const results = await Promise.all([
      call('POST', `payroll/runs/${run.id}/approve`),
      call('POST', `payroll/runs/${run.id}/approve`),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 400]);

    const paid = await Promise.all([
      call('POST', `payroll/runs/${run.id}/pay`, {}),
      call('POST', `payroll/runs/${run.id}/pay`, {}),
    ]);
    expect(paid.every((r) => r.statusCode === 201)).toBe(true); // idempotent
    const detail = await call('GET', `payroll/runs/${run.id}`);
    expect(detail.json<PayrollRunDetail>().status).toBe('paid');
  });
});
