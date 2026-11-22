import { DEFAULT_BRANCH_ID } from '@lg/contracts';
import {
  closeDb,
  courses,
  createDb,
  type Database,
  enrollments,
  groups,
  invoiceLines,
  invoices,
  ledgerEntries,
  seed,
  students,
} from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { BillingGeneratorService } from './billing-generator.service.js';

let t: TestApp;
let db: Database;
let studentId = '';

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  const [c] = await db
    .insert(courses)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      name: 'BR4',
      defaultMonthlyPrice: 600000n,
      lessonDurationMin: 60,
    })
    .returning();
  const [g] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: c!.id,
      name: 'BR4-1',
      monthlyPrice: 600000n,
      maxStudents: 10,
      startDate: '2026-10-01',
      gradingConfig: { scale: '0_100', kinds: ['homework'] },
    })
    .returning();
  const [s] = await db
    .insert(students)
    .values({ branchId: DEFAULT_BRANCH_ID, fullName: 'BR4 Oʻquvchi', searchName: 'br4' })
    .returning();
  studentId = s!.id;
  // Oy o'rtasida (15-oktabr) chiqib ketgan — invoice generatsiyasidan oldin yozilgan.
  await db.insert(enrollments).values({
    groupId: g!.id,
    studentId,
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    endReason: 'left',
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

const invoiceOf = async (period: string) =>
  db
    .select()
    .from(invoices)
    .where(and(eq(invoices.studentId, studentId), eq(invoices.period, period)));

describe('BR-4: oy oʻrtasida chiqib ketgan oʻquvchi', () => {
  it('BR-4: chiqib ketgan oy uchun toʻliq narx (proporsiya yoʻq)', async () => {
    await t.app.get(BillingGeneratorService).generateMonthlyInvoices('2026-10');
    const [oct] = await invoiceOf('2026-10');
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, oct!.id));
    expect(lines.map((l) => [l.kind, l.amount])).toEqual([['tuition', 600000n]]);
    expect(oct!.total).toBe(600000n);
  });

  it('BR-4: keyingi oyda invoice va qaytarish (kredit) yoʻq', async () => {
    await t.app.get(BillingGeneratorService).generateMonthlyInvoices('2026-11');
    expect(await invoiceOf('2026-11')).toEqual([]);
    const ledger = await db
      .select({ type: ledgerEntries.entryType, amount: ledgerEntries.amount })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.studentId, studentId));
    expect(ledger).toEqual([{ type: 'invoice', amount: 600000n }]);
  });
});
