import { DEFAULT_BRANCH_ID } from '@lg/contracts';
import { type Database, enrollments, groups, lessons, students, users } from '@lg/db';
import { normalizeUz } from '@lg/i18n';
import type { Clock } from '@lg/domain';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../common/clock/clock.tokens.js';

/** Mini App davomati (MT-02): ustoz Telegram orqali, bugungi dars va uning o'quvchilari. */
export interface E2eAttendance {
  teacherTelegramId: string;
  teacherFirstName: string;
  lessonId: string;
  students: string[];
}

const TEACHER_TELEGRAM_ID = 700000001n;

/** Ustozni Telegram'ga bog'laydi va bugungi darsli alohida guruh yaratadi (BR-30: dars kuni). */
export async function createAttendanceFixtures(
  app: NestFastifyApplication,
  db: Database,
  input: { teacherId: string; courseId: string },
): Promise<E2eAttendance> {
  const today = app.get<Clock>(CLOCK_TOKEN).today();
  await db
    .update(users)
    .set({ telegramId: TEACHER_TELEGRAM_ID })
    .where(eq(users.id, input.teacherId));
  const [g] = await db
    .insert(groups)
    .values({
      branchId: DEFAULT_BRANCH_ID,
      courseId: input.courseId,
      name: 'E2E-Davomat',
      monthlyPrice: 600000n,
      maxStudents: 20,
      startDate: today,
      gradingConfig: { scale: '0_100', kinds: ['homework'] },
    })
    .returning();
  if (!g) throw new Error('e2e davomat guruhi yaratilmadi');
  const names = ['E2E Davomat Ali', 'E2E Davomat Vali', 'E2E Davomat Gulnora'];
  for (const fullName of names) {
    const [s] = await db
      .insert(students)
      .values({ branchId: DEFAULT_BRANCH_ID, fullName, searchName: normalizeUz(fullName) })
      .returning();
    if (!s) throw new Error("e2e o'quvchisi yaratilmadi");
    await db.insert(enrollments).values({ groupId: g.id, studentId: s.id, startDate: today });
  }
  const [lesson] = await db
    .insert(lessons)
    .values({
      groupId: g.id,
      date: today,
      startTime: '09:00',
      endTime: '10:30',
      teacherId: input.teacherId,
    })
    .returning();
  if (!lesson) throw new Error('e2e darsi yaratilmadi');
  return {
    teacherTelegramId: TEACHER_TELEGRAM_ID.toString(),
    teacherFirstName: 'Ustoz',
    lessonId: lesson.id,
    students: names,
  };
}
