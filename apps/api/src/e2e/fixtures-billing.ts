import { DEFAULT_BRANCH_ID } from '@lg/contracts';
import { courses, type Database, enrollments, groups, students } from '@lg/db';
import { normalizeUz } from '@lg/i18n';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../common/clock/clock.tokens.js';
import { BillingGeneratorService } from '../modules/billing/billing-generator.service.js';

/** To'lov ssenariylari uchun o'quvchi: joriy oy invoice'i bor (qarz = `monthlyPrice`). */
export interface E2eStudent {
  id: string;
  fullName: string;
  code: number;
  groupName: string;
  /** So'm, JSON'da string (pul — bigint). */
  debt: string;
}

const MONTHLY_PRICE = 600000n;
const POOL_SIZE = 8;

/**
 * Bitta guruh, unga oy boshidan yozilgan o'quvchilar hovuzi va joriy oy invoice'lari
 * (haqiqiy `BillingGeneratorService` — cron bilan bir xil yo'l).
 */
export async function createBillingFixtures(
  app: NestFastifyApplication,
  db: Database,
): Promise<{ students: E2eStudent[]; courseId: string }> {
  const period = app.get<Clock>(CLOCK_TOKEN).today().slice(0, 7);
  const monthStart = `${period}-01`;
  const [c] = await db
    .insert(courses)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      name: 'E2E Matematika',
      defaultMonthlyPrice: MONTHLY_PRICE,
      lessonDurationMin: 90,
    })
    .returning();
  if (!c) throw new Error('e2e kursi yaratilmadi');
  const [g] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: c.id,
      name: 'E2E-1',
      monthlyPrice: MONTHLY_PRICE,
      maxStudents: 20,
      startDate: monthStart,
      gradingConfig: { scale: '0_100', kinds: ['homework'] },
    })
    .returning();
  if (!g) throw new Error('e2e guruhi yaratilmadi');
  const out: E2eStudent[] = [];
  for (let i = 1; i <= POOL_SIZE; i += 1) {
    const fullName = `E2E Oʻquvchi ${i}`;
    const [s] = await db
      .insert(students)
      .values({ branchId: DEFAULT_BRANCH_ID, fullName, searchName: normalizeUz(fullName) })
      .returning();
    if (!s) throw new Error("e2e o'quvchisi yaratilmadi");
    await db.insert(enrollments).values({ groupId: g.id, studentId: s.id, startDate: monthStart });
    out.push({
      id: s.id,
      fullName,
      code: s.code,
      groupName: g.name,
      debt: MONTHLY_PRICE.toString(),
    });
  }
  await app.get(BillingGeneratorService).generateMonthlyInvoices(period);
  return { students: out, courseId: c.id };
}
