import {
  DEFAULT_BRANCH_ID,
  type DebtAgingResponse,
  type LeadsConversionReportResponse,
  type RevenueReportResponse,
  type RoleCode,
} from '@lg/contracts';
import {
  closeDb,
  courses,
  createDb,
  type Database,
  enrollments,
  files,
  groups,
  groupTeachers,
  invoiceLines,
  invoices,
  leads,
  ledgerEntries,
  notifications,
  paymentAllocations,
  payments,
  seed,
  students,
  users,
} from '@lg/db';
import { and, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

// FR-DASH-2/4 (T-158): sof tushum, kesimlar, fayl mazmuni va bot chatiga yuborish.
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId: string;
let groupId: string;
let teacherId: string;
let userId: string;
let lineId: string;

const call = (method: 'GET' | 'POST', url: string, o: { payload?: object; token?: string } = {}) =>
  t.app.inject({
    method,
    url: `/api/reports/${url}`,
    payload: o.payload,
    headers: { authorization: `Bearer ${o.token ?? tokens.get('director')!}` },
  });

async function pay(
  amount: bigint,
  at: string,
  over: { allocate?: bigint; reversalOf?: string } = {},
) {
  const [p] = await db
    .insert(payments)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      studentId,
      amount,
      method: 'cash',
      paidAt: new Date(at),
      reversalOf: over.reversalOf ?? null,
    })
    .returning();
  if (over.allocate)
    await db
      .insert(paymentAllocations)
      .values({ paymentId: p!.id, invoiceLineId: lineId, amount: over.allocate });
  return p!.id;
}

async function seedStudy(): Promise<void> {
  const branchId = DEFAULT_BRANCH_ID;
  const [course] = await db
    .insert(courses)
    .values({ branchId, name: 'Robototexnika', defaultMonthlyPrice: 1n, lessonDurationMin: 60 })
    .returning();
  const [group] = await db
    .insert(groups)
    .values({
      branchId,
      courseId: course!.id,
      name: 'ROB-1',
      monthlyPrice: 400_000n,
      maxStudents: 10,
      startDate: '2026-01-01',
      gradingConfig: { scale: '0_5', kinds: ['homework'] },
    })
    .returning();
  groupId = group!.id;
  teacherId = await createUserWithRole(db, 'teacher');
  await db.insert(groupTeachers).values({
    groupId,
    teacherId,
    role: 'main',
    fromDate: '2026-01-01',
  });
  const [student] = await db
    .insert(students)
    .values({ branchId, fullName: 'Gʻulomov Шоҳруҳ', searchName: 'gulomov' })
    .returning();
  studentId = student!.id;
  const [enr] = await db
    .insert(enrollments)
    .values({ groupId, studentId, startDate: '2026-01-01' })
    .returning();
  const [inv] = await db
    .insert(invoices)
    .values({
      branchId,
      studentId,
      period: '2026-05',
      dueDate: '2026-05-10',
      total: 400_000n,
      status: 'open',
    })
    .returning();
  const [line] = await db
    .insert(invoiceLines)
    .values({
      invoiceId: inv!.id,
      enrollmentId: enr!.id,
      kind: 'tuition',
      amount: 400_000n,
      description: 'May',
    })
    .returning();
  lineId = line!.id;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  await seedStudy();
  userId = await createUserWithRole(db, 'admin');
  await db.update(users).set({ telegramId: 880_011n }).where(eq(users.id, userId));
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('FR-DASH-2: tushum hisoboti', () => {
  it('storno va qaytarish ayriladi; oy Toshkent vaqti bilan; jami hamma kesimda teng', async () => {
    await pay(400_000n, '2026-05-31T19:30:00Z', { allocate: 300_000n }); // Toshkentda 1-iyun
    const wrong = await pay(200_000n, '2026-06-02T06:00:00Z', { allocate: 100_000n });
    await pay(-200_000n, '2026-06-02T07:00:00Z', { reversalOf: wrong });
    await pay(-50_000n, '2026-06-03T07:00:00Z'); // avansdan qaytarildi

    const june = async (groupBy: string) =>
      (
        await call('GET', `revenue?groupBy=${groupBy}&from=2026-06-01&to=2026-06-30`)
      ).json<RevenueReportResponse>();
    const month = await june('month');
    expect(month.items).toEqual([
      { id: '2026-06', name: '2026-06', totalRevenue: '350000', paymentCount: 1, studentCount: 1 },
    ]);
    const course = await june('course');
    expect(course.items.map((i) => [i.name, i.totalRevenue])).toEqual([
      ['Robototexnika', '300000'],
      ['', '50000'],
    ]);
    expect((await june('group')).items[0]).toMatchObject({ id: groupId, totalRevenue: '300000' });
    expect((await june('teacher')).items[0]).toMatchObject({ id: teacherId });
    for (const g of ['course', 'group', 'teacher'])
      expect([(await june(g)).totalRevenue, (await june(g)).totalPayments]).toEqual(['350000', 1]);
    const may = (
      await call('GET', 'revenue?from=2026-05&to=2026-05')
    ).json<RevenueReportResponse>();
    expect(may.totalRevenue).toBe('0');
  });

  it('BR-20: qoldigʻi yopilgan hisob muddati oʻtgan qarz boʻlib koʻrinmaydi', async () => {
    await pay(100_000n, '2026-06-05T06:00:00Z', { allocate: 100_000n });
    await db.insert(ledgerEntries).values({
      branchId: DEFAULT_BRANCH_ID,
      studentId,
      entryType: 'invoice',
      amount: 10_000n,
    });
    const body = (await call('GET', 'debt-aging')).json<DebtAgingResponse>();
    const row = body.debtors.find((d) => d.studentId === studentId);
    expect([row?.bucket, row?.daysOverdue]).toEqual(['fresh', 0]);
  });

  it('lidlar: davr filtri; manbasiz lid — other', async () => {
    await db.insert(leads).values({
      branchId: DEFAULT_BRANCH_ID,
      fullName: 'Lid',
      searchName: 'lid',
      phone: '+998901112200',
      source: null,
      status: 'won',
      studentId,
      createdAt: new Date('2026-03-31T20:00:00Z'), // Toshkentda 1-aprel
    });
    const get = async (from: string, to: string) =>
      (await call('GET', `leads?from=${from}&to=${to}`)).json<LeadsConversionReportResponse>();
    expect((await get('2026-04-01', '2026-04-30')).bySource).toMatchObject([
      { source: 'other', totalLeads: 1, wonCount: 1 },
    ]);
    expect((await get('2026-03-01', '2026-03-31')).totalLeads).toBe(0);
  });
});

describe('FR-DASH-4: fayl', () => {
  it('har tur Excel va PDF’da ochiladi (kirill/oʻ bilan); Excel’da ustunlar va summa — son', async () => {
    const types = ['revenue', 'debt-aging', 'attendance', 'cohort', 'leads', 'teacher-performance'];
    for (const type of types)
      for (const format of ['excel', 'pdf']) {
        const res = await call('GET', `${type}/export/${format}`);
        expect([type, format, res.statusCode]).toEqual([type, format, 200]);
      }
    const res = await call('GET', 'debt-aging/export/excel');
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(res.rawPayload as unknown as ArrayBuffer);
    const sheet = book.worksheets[0]!;
    expect(sheet.getRow(4).getCell(2).value).toBe('Oʻquvchi');
    const rows = sheet.getRows(5, sheet.rowCount - 4) ?? [];
    const mine = rows.find((r) => r.getCell(2).value === 'Gʻulomov Шоҳруҳ');
    expect(typeof mine?.getCell(4).value).toBe('number');
    expect((await call('GET', 'revenue/export/csv')).statusCode).toBe(404);
  });
});

describe('T-158: fayl bot chatiga', () => {
  const send = (type: string, payload: object, token?: string) =>
    call('POST', `${type}/send`, { payload, token });
  const mine = () =>
    db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, 'report_file')));

  it('RBAC: ota-ona/ustoz — 403; Admin moliyaviy hisobotni ololmaydi (FR-FIN-3)', async () => {
    for (const role of ['guardian', 'teacher'] as const)
      expect((await send('attendance', { format: 'excel' }, tokens.get(role)!)).statusCode).toBe(
        403,
      );
    const admin = tokens.get('admin')!;
    expect((await send('revenue', { format: 'excel' }, admin)).statusCode).toBe(403);
    expect((await send('nomalum', { format: 'excel' }, admin)).statusCode).toBe(400);
  });

  it('fayl saqlanadi va navbatga; 10 daqiqada takror — bitta; boshqa davr — alohida', async () => {
    const token = await tokenFor(t, db, userId, 'admin');
    const body = { format: 'excel', from: '2026-06-01', to: '2026-06-30' };
    const both = await Promise.all([
      send('attendance', body, token),
      send('attendance', body, token),
    ]);
    expect(both.map((r) => r.statusCode)).toEqual([202, 202]);
    expect(both.map((r) => r.json<{ status: string }>().status).sort()).toEqual([
      'already_sent',
      'queued',
    ]);
    const [n, ...rest] = await mine();
    expect(rest).toEqual([]);
    expect(n).toMatchObject({ title: 'Davomat', status: 'queued' });
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, String(n!.payload['fileId'])));
    expect(file).toMatchObject({ purpose: 'report_export', uploadedBy: userId });

    await send('attendance', { ...body, to: '2026-06-29' }, token);
    expect(await mine()).toHaveLength(2);
  });
});
