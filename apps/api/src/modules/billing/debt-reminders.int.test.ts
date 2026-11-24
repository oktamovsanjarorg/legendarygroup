import type { DebtorListResponse, RoleCode, SendReminderResponse } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  guardians,
  invoices,
  ledgerEntries,
  notifications,
  paymentReminders,
  seed,
  studentGuardians,
  students,
  users,
} from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { DebtRemindersService } from './debt-reminders.service.js';

const TODAY = formatDateToYmd(new Date());

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId: string;
let parentUserId: string;

const call = (method: 'GET' | 'POST', url: string, role: RoleCode = 'admin') =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    headers: { authorization: `Bearer ${tokens.get(role)!}` },
  });
const remind = () => call('POST', `billing/debtors/${studentId}/remind`);
const row = async () =>
  (await call('GET', 'billing/debtors'))
    .json<DebtorListResponse>()
    .items.find((i) => i.id === studentId);

async function addInvoice(dueDate: string, total: bigint) {
  const [inv] = await db
    .insert(invoices)
    .values({ studentId, period: dueDate.slice(0, 7), dueDate, total, status: 'open' })
    .returning();
  await db.insert(ledgerEntries).values({
    studentId,
    entryType: 'invoice',
    amount: total,
    refTable: 'invoices',
    refId: inv!.id,
  });
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const [s] = await db
    .insert(students)
    .values({ fullName: 'Oʻktam Gʻaniyev', searchName: "o'ktam g'aniyev" })
    .returning();
  studentId = s!.id;
  parentUserId = await createUserWithRole(db, 'guardian', '+998905550011');
  const [g] = await db
    .insert(guardians)
    .values({ fullName: 'Gʻaniyeva Lola', phone: '+998905550011', userId: parentUserId })
    .returning();
  await db
    .insert(studentGuardians)
    .values({ studentId, guardianId: g!.id, relation: 'mother', isPrimary: true });
  await addInvoice(addDays(TODAY, -40), 500_000n);
  await addInvoice(addDays(TODAY, -9), 300_000n);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Qarz eslatmalari (T-132, BR-21, Q-100)', () => {
  it('Telegram ulanmagan ota-ona: 409, eslatma sanalmaydi; roʻyxatda raqami bor', async () => {
    const res = await remind();
    expect(res.statusCode).toBe(409);
    expect(res.json<{ code: string }>().code).toBe('GUARDIAN_TELEGRAM_NOT_LINKED');
    expect(await db.select().from(paymentReminders)).toHaveLength(0);
    expect(await row()).toMatchObject({
      guardian: { name: 'Gʻaniyeva Lola', phone: '+998905550011' },
      canRemind: false,
      remindedToday: false,
      reminders: 0,
    });
  });

  it('BR-21: ikki qarzdor oy — ota-onaga kuniga bitta xabar, jami summa bilan; takror — yoʻq', async () => {
    await db.update(users).set({ telegramId: 777001n }).where(eq(users.id, parentUserId));
    const service = t.app.get(DebtRemindersService);
    expect((await service.processScheduledReminders()).sentCount).toBe(1);
    const sent = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'billing_reminder'));
    expect(sent).toHaveLength(1);
    expect(sent[0]?.body).toContain('800');
    expect(await row()).toMatchObject({ reminders: 1 });
    expect((await service.processScheduledReminders()).sentCount).toBe(0);
  });

  it('qoʻlda: bir kunda bitta — ikkinchisi 409, ikkinchi xabar yoʻq', async () => {
    const first = await remind();
    expect(first.statusCode).toBe(201);
    expect(first.json<SendReminderResponse>().reminderCount).toBe(2);
    expect(await row()).toMatchObject({ canRemind: true, remindedToday: true });
    const second = await remind();
    expect(second.statusCode).toBe(409);
    expect(second.json<{ code: string }>().code).toBe('REMINDER_ALREADY_SENT');
    expect(await db.select().from(notifications)).toHaveLength(2);
  });

  it('ustoz va ota-ona eslatma yubora olmaydi', async () => {
    for (const role of ['teacher', 'guardian'] as const)
      expect((await call('POST', `billing/debtors/${studentId}/remind`, role)).statusCode).toBe(
        403,
      );
  });

  it('qidiruv: apostrof yozuvi farqsiz, telefon raqami ham', async () => {
    for (const q of ["o'ktam", 'Oʻktam', '5550011']) {
      const res = await call('GET', `billing/debtors?search=${encodeURIComponent(q)}`);
      expect(res.json<DebtorListResponse>().items).toHaveLength(1);
    }
  });
});
