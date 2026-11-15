import { DEFAULT_BRANCH_ID } from '@lg/contracts';
import {
  attendance,
  closeDb,
  courses,
  createDb,
  type Database,
  enrollmentFreezes,
  enrollments,
  groups,
  invoiceLines,
  invoices,
  ledgerEntries,
  lessons,
  seed,
  students,
} from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { BillingGeneratorService } from './billing-generator.service.js';
import { prevPeriodOf } from './month-close.service.js';

let t: TestApp;
let db: Database;
let studentId = '';

const OCT = Array.from({ length: 12 }, (_, i) => `2026-10-${String(2 + i * 2).padStart(2, '0')}`);

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  const teacher = await createUserWithRole(db, 'teacher');
  const [c] = await db
    .insert(courses)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      name: 'BR2',
      defaultMonthlyPrice: 600000n,
      lessonDurationMin: 60,
    })
    .returning();
  const [g] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: c!.id,
      name: 'BR2-1',
      monthlyPrice: 600000n,
      maxStudents: 10,
      startDate: '2026-10-01',
      gradingConfig: { scale: '0_100', kinds: ['homework'] },
      // BR-8: 3 tadan ortiq har sababsiz dars — 10 000 so'm (guruh sozlamasi).
      penaltyConfig: {
        enabled: true,
        absenceThreshold: 3,
        penaltyPerLesson: '10000',
        lateThresholdMin: 15,
      },
    })
    .returning();
  const [s] = await db
    .insert(students)
    .values({ branchId: DEFAULT_BRANCH_ID, fullName: 'BR2 Oʻquvchi', searchName: 'br2' })
    .returning();
  studentId = s!.id;
  const [e] = await db
    .insert(enrollments)
    .values({ groupId: g!.id, studentId, startDate: '2026-10-01' })
    .returning();
  const rows = await db
    .insert(lessons)
    .values(
      OCT.map((date) => ({
        groupId: g!.id,
        date,
        startTime: '10:00',
        endTime: '11:00',
        teacherId: teacher,
      })),
    )
    .returning();
  const cancel = (id: string, compensation: 'credit' | 'makeup' | null) =>
    db
      .update(lessons)
      .set({
        status: 'cancelled',
        cancelSource: 'manual',
        cancelledAt: new Date(),
        cancelReason: 'Ustoz kasal',
        compensation,
      })
      .where(eq(lessons.id, id));
  await cancel(rows[0]!.id, null); // BR-5: kredit
  await cancel(rows[1]!.id, 'makeup'); // qo'shimcha dars bilan qoplangan — kredit yo'q
  // BR-9: 10-21..10-25 muzlatish — 2 dars (10-22, 10-24).
  await db.insert(enrollmentFreezes).values({
    enrollmentId: e!.id,
    fromDate: '2026-10-21',
    toDate: '2026-10-25',
    reason: 'Kasalxona',
  });
  // BR-8: 5 sababsiz (3 dan ortig'i — 2).
  await db
    .insert(attendance)
    .values(
      rows
        .slice(2, 7)
        .map((l) => ({ lessonId: l.id, studentId, status: 'absent' as const, markedBy: teacher })),
    );
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('BR-2: oyni yopish → yangi oy invoice (BR-5, BR-8, BR-9)', () => {
  it('oldingi davr: yil oʻtishi', () => {
    expect(prevPeriodOf('2027-01')).toBe('2026-12');
    expect(prevPeriodOf('2026-11')).toBe('2026-10');
  });

  it('BR-2: kredit oʻqish qatoridan ayriladi, jarima — alohida qator; ledger brutto + kredit', async () => {
    const gen = t.app.get(BillingGeneratorService);
    await gen.generateMonthlyInvoices('2026-10');
    await gen.generateMonthlyInvoices('2026-11');
    const [nov] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.studentId, studentId), eq(invoices.period, '2026-11')));
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, nov!.id));
    // BR-5: 1/12 × 600 000 = 50 000; BR-9: 2/12 × 600 000 = 100 000 → o'qish 450 000.
    expect(lines.find((l) => l.kind === 'tuition')?.amount).toBe(450000n);
    expect(lines.find((l) => l.kind === 'penalty')?.amount).toBe(20000n);
    expect(nov!.total).toBe(470000n);
    const ledger = await db
      .select({ type: ledgerEntries.entryType, amount: ledgerEntries.amount })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.studentId, studentId));
    expect(ledger.filter((l) => l.type === 'credit').map((l) => l.amount)).toEqual([-150000n]);
    expect(ledger.filter((l) => l.type === 'penalty').map((l) => l.amount)).toEqual([20000n]);
    // Balans = ledger yig'indisi: okt 600 000 + noy (600 000 − 150 000 + 20 000).
    expect(ledger.reduce((s, l) => s + l.amount, 0n)).toBe(1070000n);
  });

  it('BR-2 idempotent: qayta ishga tushirish — yangi qator/kredit yoʻq', async () => {
    await t.app.get(BillingGeneratorService).generateMonthlyInvoices('2026-11');
    const credits = await db
      .select()
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.studentId, studentId), eq(ledgerEntries.entryType, 'credit')));
    expect(credits).toHaveLength(1);
  });
});
