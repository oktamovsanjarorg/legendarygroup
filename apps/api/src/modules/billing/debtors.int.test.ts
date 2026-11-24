import type { DebtorListResponse, RoleCode } from '@lg/contracts';
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
import { addDays, formatDateToYmd } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { DebtRemindersService } from './debt-reminders.service.js';

// Aging bucket haqiqiy bugungi kunga nisbatan hisoblanadi — qattiq sana (2026-11-08) 16-noyabrdan
// boshlab boshqa bucket'ga o'tib, CI'ni yiqitardi. Muddatlar bugundan sanaladi.
const TODAY = formatDateToYmd(new Date());

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let reminders: DebtRemindersService;

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
  reminders = t.app.get(DebtRemindersService);

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
  });

  const [inv1] = await db
    .insert(invoices)
    .values({
      studentId: student1Id,
      period: addDays(TODAY, -20).slice(0, 7),
      dueDate: addDays(TODAY, -20), // d8_30
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
  });

  const [inv2] = await db
    .insert(invoices)
    .values({
      studentId: student2Id,
      period: addDays(TODAY, -5).slice(0, 7),
      dueDate: addDays(TODAY, -5), // d0_7
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

  it('IDOR: ota-ona (billing.view — faqat oʻz farzandi) markaz qarzdorlarini koʻra olmaydi', async () => {
    expect((await call('GET', 'billing/debtors', 'guardian')).statusCode).toBe(403);
    expect((await call('GET', 'billing/debtors/export', 'guardian')).statusCode).toBe(403);
    expect(
      (await call('POST', `billing/debtors/${student1Id}/remind`, 'guardian')).statusCode,
    ).toBe(403);
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

  it('BR-21 avtomatik eslatmalar jadvali ishlaydi va takrorlanmaydi', async () => {
    const result = await reminders.processScheduledReminders();
    expect(result).toBeDefined();

    expect(result.sentCount).toBe(0); // ota-ona ulanmagan — «yuborildi» deb yozilmaydi (Q-100)
    expect(await db.select().from(paymentReminders)).toHaveLength(0);

    // Qayta chaqirilganda bir xil invoice uchun shu milestone takrorlanmasligi kerak
    const secondRun = await reminders.processScheduledReminders();
    expect(secondRun.sentCount).toBe(0);
  });

  it('criticalOnly=false — filtr oʻchiq (satr "false" rost deb oʻqilmaydi)', async () => {
    const res = await call('GET', 'billing/debtors?criticalOnly=false', 'admin');
    expect(res.json<DebtorListResponse>().items).toHaveLength(2);
  });

  it('BR-20: toʻliq toʻlangan eski hisob kechikish kuniga kirmaydi', async () => {
    const [old] = await db
      .insert(invoices)
      .values({
        studentId: student2Id,
        period: '2026-01',
        dueDate: addDays(TODAY, -90),
        total: 0n,
        status: 'open',
      })
      .returning();
    const res = await call('GET', 'billing/debtors', 'admin');
    const row = res.json<DebtorListResponse>().items.find((i) => i.id === student2Id);
    expect(row?.overdueDays).toBe(5);
    await db.delete(invoices).where(eq(invoices.id, old!.id));
  });

  it('BR-21: haftalik eslatma har hafta (weekly_1, weekly_2) ketsin va cron kechiksa ham oraliq eslatma yoʻqolmasin', async () => {
    // 1) Cron 1 kun kechikkanda (masalan 4 kun o'tganda overdue_3 yuborilishi)
    const type4 = reminders.determineMilestoneType('2026-11-01', '2026-11-05');
    expect(type4).toBe('overdue_3');

    // 2) 8 kun o'tganda (7-kun o'tkazib yuborilgan bo'lsa ham overdue_7)
    const type8 = reminders.determineMilestoneType('2026-11-01', '2026-11-09');
    expect(type8).toBe('overdue_7');

    // 3) 14 kun o'tganda (1-hafta) -> weekly_1
    const typeW1 = reminders.determineMilestoneType('2026-11-01', '2026-11-15');
    expect(typeW1).toBe('weekly_1');

    // 4) 15 kun o'tganda (14-kun o'tkazib yuborilgan bo'lsa ham) -> weekly_1
    const typeW1Late = reminders.determineMilestoneType('2026-11-01', '2026-11-16');
    expect(typeW1Late).toBe('weekly_1');

    // 5) 21 kun o'tganda (2-hafta) -> weekly_2
    const typeW2 = reminders.determineMilestoneType('2026-11-01', '2026-11-22');
    expect(typeW2).toBe('weekly_2');
  });
});
