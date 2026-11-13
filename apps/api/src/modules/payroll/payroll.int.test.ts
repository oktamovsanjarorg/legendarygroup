import type { PayrollRunDetail, RoleCode, TeacherContract } from '@lg/contracts';
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
} from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

let teacher1UserId: string;
let teacher1Token: string;
let teacher2UserId: string;
let teacher2Token: string;
let parentToken: string;

let groupId: string;
let runId: string;

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);

  const adminToken = tokens.get('admin')!;
  const adminUserId = await createUserWithRole(db, 'admin', '+998909998877');

  teacher1UserId = await createUserWithRole(db, 'teacher', '+998901112233');
  teacher1Token = await tokenFor(t, db, teacher1UserId, 'teacher');

  teacher2UserId = await createUserWithRole(db, 'teacher', '+998902223344');
  teacher2Token = await tokenFor(t, db, teacher2UserId, 'teacher');

  const parentUserId = await createUserWithRole(db, 'guardian', '+998903334455');
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  const courseRes = await call('POST', 'courses', adminToken, {
    name: 'Mental arifmetika',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 60,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const roomRes = await call('POST', 'rooms', adminToken, { name: 'Xona 101', capacity: 15 });
  const roomId = roomRes.json<{ id: string }>().id;

  const groupRes = await call('POST', 'groups', adminToken, {
    courseId,
    roomId,
    name: 'MATH-01',
    maxStudents: 12,
    startDate: '2026-11-01',
    monthlyPrice: '500000',
    teachers: [{ teacherId: teacher1UserId, role: 'main' }],
  });
  groupId = groupRes.json<{ id: string }>().id;

  // 12 ta dars yaratish: 10 tasini teacher1, 2 tasini teacher2 o'rinbosar sifatida o'tgan
  for (let day = 1; day <= 12; day++) {
    const isSub = day > 10;
    const teacherId = isSub ? teacher2UserId : teacher1UserId;
    await db.insert(lessons).values({
      groupId,
      date: `2026-11-${String(day).padStart(2, '0')}`,
      startTime: '14:00',
      endTime: '15:00',
      roomId,
      teacherId,
      isSubstitute: isSub,
      status: 'done',
    });
  }

  // O'quvchi va uning to'lovi (taqsimlangan baza uchun)
  const studentRes = await call('POST', 'students', adminToken, {
    fullName: 'Kamolov Javohir',
    birthDate: '2010-04-15',
    gender: 'male',
  });
  const studentId = studentRes.json<{ id: string }>().id;

  const enrollRes = await call('POST', 'enrollments', adminToken, {
    studentId,
    groupId,
    startDate: '2026-11-01',
  });
  const enrollmentId = enrollRes.json<{ id: string }>().id;

  // Invoice va uning qatori
  const [inv] = await db
    .insert(invoices)
    .values({
      studentId,
      period: '2026-11',
      dueDate: '2026-11-10',
      total: 500_000n,
      status: 'paid',
    })
    .returning();

  const [line] = await db
    .insert(invoiceLines)
    .values({
      invoiceId: inv!.id,
      enrollmentId,
      kind: 'tuition',
      amount: 500_000n,
      description: 'Noyabr oylik',
    })
    .returning();

  // 500 000 so'm to'lov va taqsimot
  const [pay] = await db
    .insert(payments)
    .values({
      studentId,
      amount: 500_000n,
      method: 'cash',
      paidAt: new Date('2026-11-05T10:00:00Z'),
      receivedBy: adminUserId,
      idempotencyKey: 'int-test-pay-1',
    })
    .returning();

  await db.insert(paymentAllocations).values({
    paymentId: pay!.id,
    invoiceLineId: line!.id,
    amount: 500_000n,
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('T-401 & T-402: Ustoz oyligi (Payroll Calculation & Contracts)', () => {
  it('RBAC: admin yoki ota-ona shartnoma yarata olmaydi (403)', async () => {
    const res = await call('POST', 'payroll/contracts', parentToken, {
      teacherId: teacher1UserId,
      type: 'fixed',
      fixedAmount: '5000000',
      validFrom: '2026-11-01',
    });
    expect(res.statusCode).toBe(403);

    const adminRes = await call('POST', 'payroll/contracts', tokens.get('admin')!, {
      teacherId: teacher1UserId,
      type: 'fixed',
      fixedAmount: '5000000',
      validFrom: '2026-11-01',
    });
    expect(adminRes.statusCode).toBe(403);
  });

  it('Ustozlar uchun shartnomalar yaratiladi (mixed va fixed)', async () => {
    // Teacher 1: mixed (fiks 6M + 30% ulush + o'rinbosar 150k)
    const res1 = await call('POST', 'payroll/contracts', tokens.get('director')!, {
      teacherId: teacher1UserId,
      type: 'mixed',
      fixedAmount: '6000000',
      percentBp: 3000, // 30%
      perLessonRate: '150000',
      base: 'collected',
      validFrom: '2026-11-01',
    });
    expect(res1.statusCode).toBe(201);
    const c1 = res1.json<TeacherContract>();
    expect(c1.type).toBe('mixed');
    expect(c1.fixedAmount).toBe('6000000');

    // Teacher 2: fixed (fiks 3M + o'rinbosar 200k)
    const res2 = await call('POST', 'payroll/contracts', tokens.get('director')!, {
      teacherId: teacher2UserId,
      type: 'fixed',
      fixedAmount: '3000000',
      perLessonRate: '200000',
      base: 'collected',
      validFrom: '2026-11-01',
    });
    expect(res2.statusCode).toBe(201);
  });

  it('Ustozga avans beriladi (BR-28)', async () => {
    const res = await call('POST', 'payroll/advances', tokens.get('director')!, {
      teacherId: teacher1UserId,
      amount: '1000000',
      givenAt: '2026-11-15',
      note: 'Kasalxona xarajatlari uchun',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ id: string }>().id).toBeDefined();
  });

  it('BR-23…BR-28: Oylik hisob-kitob qoralamasi generatsiya qilinadi', async () => {
    const res = await call('POST', 'payroll/runs/generate', tokens.get('director')!, {
      period: '2026-11',
    });
    expect(res.statusCode).toBe(201);
    const run = res.json<PayrollRunDetail>();
    expect(run.status).toBe('draft');
    runId = run.id;

    // 2 ta ustoz bo'lishi kerak
    expect(run.teachers.length).toBe(2);

    const t1 = run.teachers.find((t) => t.teacherId === teacher1UserId);
    expect(t1).toBeDefined();
    // Teacher 1:
    // 1) Fiks: 6M dan 2/12 o'rinbosar o'tgani uchun prorate kamaygan:
    // 6M - (6M * 2 / 12) = 5M
    const fixedItem = t1?.items.find((i) => i.kind === 'fixed');
    expect(fixedItem?.amount).toBe('5000000');

    // 2) Foiz: 500 000 dan 30% = 150 000
    const percentItem = t1?.items.find((i) => i.kind === 'percent');
    expect(percentItem?.amount).toBe('150000');

    // 3) Avans: -1 000 000 ushlandi
    const advanceItem = t1?.items.find((i) => i.kind === 'advance');
    expect(advanceItem?.amount).toBe('-1000000');

    // Net: 5 000 000 + 150 000 - 1 000 000 = 4 150 000
    expect(t1?.totalNet).toBe('4150000');

    const t2 = run.teachers.find((t) => t.teacherId === teacher2UserId);
    expect(t2).toBeDefined();
    // Teacher 2 o'rinbosar sifatida 2 ta dars o'tgan: 2 * 200 000 = 400 000
    const subItem = t2?.items.find((i) => i.kind === 'per_lesson');
    expect(subItem?.amount).toBe('400000');
  });

  it('BR-26: Bonus kiritiladi va jami summa qayta hisoblanadi', async () => {
    const res = await call('POST', `payroll/runs/${runId}/adjustments`, tokens.get('director')!, {
      teacherId: teacher1UserId,
      kind: 'bonus',
      amount: '500000',
      note: 'Olimpiada natijalari uchun mukofot',
    });
    expect(res.statusCode).toBe(201);

    const getRes = await call('GET', `payroll/runs/${runId}`, tokens.get('director')!);
    const run = getRes.json<PayrollRunDetail>();
    const t1 = run.teachers.find((t) => t.teacherId === teacher1UserId);
    // 4 150 000 + 500 000 = 4 650 000
    expect(t1?.totalNet).toBe('4650000');
  });

  it('BR-27: Director oylikni tasdiqlaydi (approve)', async () => {
    const res = await call('POST', `payroll/runs/${runId}/approve`, tokens.get('director')!);
    expect(res.statusCode).toBe(201);

    const getRes = await call('GET', `payroll/runs/${runId}`, tokens.get('director')!);
    const run = getRes.json<PayrollRunDetail>();
    expect(run.status).toBe('approved');
    expect(run.approvedBy).toBeDefined();
  });

  it('Tasdiqlangan oylik hisobiga adjustment kiritish yoki qayta generatsiya bloklanadi (400)', async () => {
    const adjRes = await call(
      'POST',
      `payroll/runs/${runId}/adjustments`,
      tokens.get('director')!,
      {
        teacherId: teacher1UserId,
        kind: 'penalty',
        amount: '100000',
        note: 'Kechikish',
      },
    );
    expect(adjRes.statusCode).toBe(400);
    expect(adjRes.json<{ code: string }>().code).toBe('PAYROLL_ALREADY_APPROVED');

    const genRes = await call('POST', 'payroll/runs/generate', tokens.get('director')!, {
      period: '2026-11',
    });
    expect(genRes.statusCode).toBe(400);
    expect(genRes.json<{ code: string }>().code).toBe('PAYROLL_ALREADY_APPROVED');
  });

  it('BR-27: Oylik toʻlangan deb belgilanadi (pay)', async () => {
    const res = await call('POST', `payroll/runs/${runId}/pay`, tokens.get('director')!, {});
    expect(res.statusCode).toBe(201);

    const getRes = await call('GET', `payroll/runs/${runId}`, tokens.get('director')!);
    expect(getRes.json<PayrollRunDetail>().status).toBe('paid');
  });

  it('Ustoz oylik hisobini koʻrganda faqat oʻz maʼlumotlarini koʻradi', async () => {
    const res = await call('GET', `payroll/runs/${runId}`, teacher1Token);
    expect(res.statusCode).toBe(200);
    const run = res.json<PayrollRunDetail>();
    // Faqat teacher 1 ma'lumotlari chiqishi kerak
    expect(run.teachers.length).toBe(1);
    expect(run.teachers[0]?.teacherId).toBe(teacher1UserId);

    const res2 = await call('GET', `payroll/runs/${runId}`, teacher2Token);
    expect(res2.statusCode).toBe(200);
    expect(res2.json<PayrollRunDetail>().teachers[0]?.teacherId).toBe(teacher2UserId);
  });
});
