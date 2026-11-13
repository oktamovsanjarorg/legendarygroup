import type { DebtorListResponse, RoleCode, SendReminderResponse } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  enrollments,
  invoices,
  ledgerEntries,
  paymentReminders,
  seed,
  students,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { DebtorsService } from './debtors.service.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let debtorsService: DebtorsService;

let student1Id: string;
let student2Id: string;
let groupId: string;

type Method = 'GET' | 'POST';
const call = (method: Method, url: string, role?: RoleCode, payload?: object) => {
  const headers: Record<string, string> = {};
  if (role) {
    headers['authorization'] = `Bearer ${tokens.get(role)!}`;
  }
  return t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers,
  });
};

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  debtorsService = t.app.get(DebtorsService);

  // Kurs va guruh yaratamiz (narxi 600,000 UZS)
  const courseRes = await call('POST', 'courses', 'admin', {
    name: 'Matematika Int',
    defaultMonthlyPrice: '600000',
    lessonDurationMin: 60,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const groupRes = await call('POST', 'groups', 'admin', {
    courseId,
    name: 'MATH-101',
    maxStudents: 15,
    startDate: '2026-09-01',
    monthlyPrice: '600000',
  });
  groupId = groupRes.json<{ id: string }>().id;

  // 1-o'quvchi: 20 kun kechikkan, qarz 600,000 UZS -> BR-22 bo'yicha KRITIK
  const [s1] = await db
    .insert(students)
    .values({
      fullName: 'Anvar Qodirov',
      searchName: 'anvar qodirov',
      birthDate: '2010-01-01',
    })
    .returning();
  student1Id = s1!.id;

  await db.insert(enrollments).values({
    studentId: student1Id,
    groupId,
    startDate: '2026-09-01',
    status: 'active',
  });

  const [inv1] = await db
    .insert(invoices)
    .values({
      studentId: student1Id,
      period: '2026-10',
      dueDate: '2026-10-20',
      total: 60000000n,
      status: 'open',
    })
    .returning();

  await db.insert(ledgerEntries).values({
    studentId: student1Id,
    entryType: 'invoice',
    amount: 60000000n,
    refTable: 'invoices',
    refId: inv1!.id,
  });

  // 2-o'quvchi: 5 kun kechikkan, qarz 300,000 UZS -> Oddiy (kritik emas)
  const [s2] = await db
    .insert(students)
    .values({
      fullName: 'Bekzod Aliyev',
      searchName: 'bekzod aliyev',
      birthDate: '2011-02-02',
    })
    .returning();
  student2Id = s2!.id;

  await db.insert(enrollments).values({
    studentId: student2Id,
    groupId,
    startDate: '2026-09-01',
    status: 'active',
  });

  const [inv2] = await db
    .insert(invoices)
    .values({
      studentId: student2Id,
      period: '2026-11',
      dueDate: '2026-11-08',
      total: 30000000n,
      status: 'open',
    })
    .returning();

  await db.insert(ledgerEntries).values({
    studentId: student2Id,
    entryType: 'invoice',
    amount: 30000000n,
    refTable: 'invoices',
    refId: inv2!.id,
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Qarzdorlik va Eslatmalar (T-208, FR-PAY-7, BR-20, 21, 22)', () => {
  it('ruxsatsiz foydalanuvchi qarzdorlarni koʻra olmaydi (401 / 403)', async () => {
    const unauth = await call('GET', 'billing/debtors');
    expect(unauth.statusCode).toBe(401);

    const teacher = await call('GET', 'billing/debtors', 'teacher');
    expect(teacher.statusCode).toBe(403);
  });

  it('admin va direktor qarzdorlar roʻyxatini koʻradi', async () => {
    const res = await call('GET', 'billing/debtors', 'admin');
    expect(res.statusCode).toBe(200);

    const data = res.json<DebtorListResponse>();
    expect(data.items.length).toBe(2);
    expect(data.totalDebt).toBe('90000000'); // 600,000 + 300,000
  });

  it('BR-22 kritik qarz tekshiruvi toʻgʻri ishlaydi', async () => {
    const res = await call('GET', 'billing/debtors', 'director');
    const data = res.json<DebtorListResponse>();

    const s1 = data.items.find((i) => i.id === student1Id);
    expect(s1).toBeDefined();
    expect(s1?.critical).toBe(true); // >= 600,000 UZS va >= 14 kun
    expect(s1?.group).toBe('MATH-101');

    const s2 = data.items.find((i) => i.id === student2Id);
    expect(s2).toBeDefined();
    expect(s2?.critical).toBe(false); // 300,000 UZS va 5 kun
  });

  it('criticalOnly filtri faqat kritik qarzdorlarni qaytaradi', async () => {
    const res = await call('GET', 'billing/debtors?criticalOnly=true', 'admin');
    expect(res.statusCode).toBe(200);

    const data = res.json<DebtorListResponse>();
    expect(data.items.length).toBe(1);
    expect(data.items[0]?.id).toBe(student1Id);
  });

  it('aging bucket filtrlari toʻgʻri saralaydi', async () => {
    const resD07 = await call('GET', 'billing/debtors?bucket=d0_7', 'admin');
    const dataD07 = resD07.json<DebtorListResponse>();
    expect(dataD07.items.length).toBe(1);
    expect(dataD07.items[0]?.id).toBe(student2Id);

    const resD830 = await call('GET', 'billing/debtors?bucket=d8_30', 'admin');
    const dataD830 = resD830.json<DebtorListResponse>();
    expect(dataD830.items.length).toBe(1);
    expect(dataD830.items[0]?.id).toBe(student1Id);

    const resD30 = await call('GET', 'billing/debtors?bucket=d30', 'admin');
    const dataD30 = resD30.json<DebtorListResponse>();
    expect(dataD30.items.length).toBe(0);
  });

  it('qidiruv va guruh boʻyicha filtr ishlaydi', async () => {
    const resSearch = await call('GET', 'billing/debtors?search=Anvar', 'admin');
    const dataSearch = resSearch.json<DebtorListResponse>();
    expect(dataSearch.items.length).toBe(1);
    expect(dataSearch.items[0]?.name).toBe('Anvar Qodirov');

    const resGroup = await call('GET', `billing/debtors?groupId=${groupId}`, 'admin');
    const dataGroup = resGroup.json<DebtorListResponse>();
    expect(dataGroup.items.length).toBe(2);
  });

  it('CSV eksport toʻgʻri formatda qaytadi', async () => {
    const res = await call('GET', 'billing/debtors/export', 'admin');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('debtors.csv');
    expect(res.body).toContain('Oʻquvchi,Kod,Guruh,Qarz (soʻm)');
    expect(res.body).toContain('Anvar Qodirov');
  });

  it('qoʻlda eslatma yuborish (remind) eslatma sonini oshiradi', async () => {
    const res = await call('POST', `billing/debtors/${student1Id}/remind`, 'admin');
    expect(res.statusCode).toBe(201);

    const data = res.json<SendReminderResponse>();
    expect(data.success).toBe(true);
    expect(data.reminderCount).toBe(1);

    const [record] = await db
      .select()
      .from(paymentReminders)
      .where(eq(paymentReminders.studentId, student1Id));
    expect(record).toBeDefined();
    expect(record?.type).toBe('manual');
    expect(record?.debtAmount).toBe(60000000n);

    // Qayta ro'yxat olganda reminders = 1 bo'lishi kerak
    const listRes = await call('GET', 'billing/debtors', 'admin');
    const s1 = listRes.json<DebtorListResponse>().items.find((i) => i.id === student1Id);
    expect(s1?.reminders).toBe(1);
  });

  it('BR-21 avtomatik eslatmalar jadvali ishlaydi va takrorlanmaydi', async () => {
    const result = await debtorsService.processScheduledReminders();
    expect(result).toBeDefined();

    // Qayta chaqirilganda bir xil invoice uchun shu milestone takrorlanmasligi kerak
    const secondRun = await debtorsService.processScheduledReminders();
    expect(secondRun.sentCount).toBe(0);
  });
});
