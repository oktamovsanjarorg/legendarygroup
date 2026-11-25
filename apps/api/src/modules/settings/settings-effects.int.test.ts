import {
  DEFAULT_BRANCH_ID,
  type ReceiptVerifyResponse,
  type RoleCode,
  type UpdateSystemSettings,
} from '@lg/contracts';
import {
  closeDb,
  courses,
  createDb,
  type Database,
  enrollments,
  files,
  groups,
  invoices,
  notifications,
  payments,
  receipts,
  seed,
  students,
  users,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { BillingGeneratorService } from '../billing/billing-generator.service.js';
import { ReceiptPdfService } from '../billing/receipt-pdf.service.js';

// Q-107 (T-161): sozlama saqlansa — tizim unga amal qiladi.
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
/** Hozirdan `min` daqiqa farqli Toshkent vaqti (`HH:MM`). */
const hhmmIn = (min: number) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(Date.now() + min * 60_000));
const branchId = DEFAULT_BRANCH_ID;

const patch = (body: UpdateSystemSettings | object) =>
  t.app.inject({
    method: 'PATCH',
    url: '/api/settings',
    payload: body,
    headers: { authorization: `Bearer ${tokens.get('director')!}` },
  });
const card = (n: number, isPrimary: boolean) => ({
  id: `0190a000-0000-7000-8000-0000000000c${n}`,
  cardNumber: '8600 1234 1234 1234',
  holderName: 'LG',
  bankName: 'Bank',
  isPrimary,
});

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Q-107: sozlamalar amal qiladi', () => {
  it('BR-2: toʻlov muddati kuni yangi hisobga yoziladi', async () => {
    expect((await patch({ billingDueDay: 5 })).statusCode).toBe(200);
    const [c] = await db
      .insert(courses)
      .values({ branchId, name: 'K', defaultMonthlyPrice: 100n, lessonDurationMin: 60 })
      .returning();
    const [g] = await db
      .insert(groups)
      .values({
        branchId,
        courseId: c!.id,
        name: 'G',
        monthlyPrice: 100_000n,
        maxStudents: 5,
        startDate: '2026-01-01',
        status: 'active',
        gradingConfig: { scale: '0_5', kinds: ['homework'] },
      })
      .returning();
    const [s] = await db
      .insert(students)
      .values({ branchId, fullName: 'A', searchName: 'a' })
      .returning();
    await db
      .insert(enrollments)
      .values({ groupId: g!.id, studentId: s!.id, startDate: '2026-01-01' });
    await t.app.get(BillingGeneratorService).generateMonthlyInvoices('2026-12');
    const [inv] = await db.select().from(invoices).where(eq(invoices.studentId, s!.id));
    expect(inv?.dueDate).toBe('2026-12-05');
  });

  it('T-405: kunlik xulosa sozlangan vaqtda, faqat Direktorga va kuniga bitta', async () => {
    const link = async (role: RoleCode, telegramId: bigint) => {
      const id = await createUserWithRole(db, role);
      await db.update(users).set({ telegramId }).where(eq(users.id, id));
      return id;
    };
    const [directorId, adminId] = [await link('director', 771n), await link('admin', 772n)];
    const run = () => t.app.get(CronJobs).get('dashboard.daily-summary')!.run();
    const sentTo = async (id: string) =>
      (await db.select().from(notifications).where(eq(notifications.userId, id))).length;

    await patch({ notificationTimes: { eveningDigestTime: hhmmIn(120) } });
    await run();
    expect(await sentTo(directorId)).toBe(0);
    await patch({ notificationTimes: { eveningDigestTime: hhmmIn(0) } });
    await run();
    await run();
    expect([await sentTo(directorId), await sentTo(adminId)]).toEqual([1, 0]);
  });

  it('markaz nomi chek tekshiruvida; chek PDF yaratiladi', async () => {
    await patch({ centerInfo: { name: 'Yangi Markaz ʻ' } });
    const [s] = await db
      .insert(students)
      .values({ branchId, fullName: 'Иван', searchName: 'ivan' })
      .returning();
    const [p] = await db
      .insert(payments)
      .values({ branchId, studentId: s!.id, amount: 5n, method: 'cash', paidAt: new Date() })
      .returning();
    const [r] = await db
      .insert(receipts)
      .values({ paymentId: p!.id, number: 'LG-T-1', verifyToken: 'tok-settings-1' })
      .returning();
    const pdf = t.app.get(ReceiptPdfService);
    const v: ReceiptVerifyResponse = await pdf.verifyReceipt(r!.verifyToken);
    expect(v).toMatchObject({ center: 'Yangi Markaz ʻ' });
    expect((await pdf.generateReceiptPdf('LG-T-1')).length).toBeGreaterThan(500);
  });

  it('karta: probelsiz saqlanadi; harfli yoki asosiysiz — 400', async () => {
    const ok = await patch({ paymentCards: [card(1, true), card(2, false)] });
    expect(ok.json<{ paymentCards: { cardNumber: string }[] }>().paymentCards[0]?.cardNumber).toBe(
      '8600123412341234',
    );
    for (const bad of [
      [card(1, false)],
      [card(1, true), card(2, true)],
      [{ ...card(1, true), cardNumber: '8600-abcd-1234-1234' }],
    ])
      expect((await patch({ paymentCards: bad })).statusCode).toBe(400);
  });

  it('logo: faqat `center_logo` fayli', async () => {
    const [f] = await db
      .insert(files)
      .values({
        s3Key: 'x/1',
        mime: 'image/png',
        size: 1,
        sha256: 'a'.repeat(64),
        purpose: 'student_photo',
      })
      .returning();
    expect((await patch({ centerInfo: { logoFileId: f!.id } })).statusCode).toBe(422);
  });

  it('ikki boʻlim bir vaqtda saqlansa, hech biri yoʻqolmaydi', async () => {
    await Promise.all([
      patch({ adminDiscountLimitPercent: 33 }),
      patch({ penaltyConfig: { absenceThreshold: 7 } }),
      patch({ absenceNoticeWindowMinutes: 9 }),
    ]);
    const s = await patch({ billingDueDay: 6 });
    expect(s.json()).toMatchObject({
      adminDiscountLimitPercent: 33,
      penaltyConfig: { absenceThreshold: 7 },
      absenceNoticeWindowMinutes: 9,
    });
  });
});
