import { sql } from 'drizzle-orm';
import { check, index, pgTable, smallint, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, primaryUuid, updatedAt } from './common.js';
import { students } from './students.js';
import { users } from './users.js';

/**
 * Ustozning oʻz oʻquvchi kodlari (T-128, Q-92): titul varaq va Excel importi uchun 3 xonali
 * (1–999). Har ustozda alohida kod bazasi — bir xil kod turli ustozlarda boʻlishi mumkin.
 * Ustoz oʻzi kiritadi, tizim faqat boʻsh kodni taklif qiladi. Ustoz kodni oʻchirsa — qator oʻchadi.
 */
export const teacherStudentCodes = pgTable(
  'teacher_student_codes',
  {
    id: primaryUuid(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    code: smallint('code').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('teacher_student_codes_teacher_code_uq').on(t.teacherId, t.code),
    uniqueIndex('teacher_student_codes_teacher_student_uq').on(t.teacherId, t.studentId),
    index('teacher_student_codes_student_id_idx').on(t.studentId),
    check('teacher_student_codes_code_check', sql`${t.code} BETWEEN 1 AND 999`),
  ],
);
