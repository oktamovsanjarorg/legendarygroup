import { ENROLLMENT_END_REASONS } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { groups } from './groups.js';
import { students } from './students.js';
import { users } from './users.js';

/**
 * Guruhga yozish (FR-STU-3, T-106). Holat saqlanmaydi — sanalardan hisoblanadi
 * (`enrollmentState`). Bir o'quvchi bir guruhda bir davrda bir marta — EXCLUDE (0015).
 * Tugash sanasi va sababi birga qo'yiladi (rejalashtirilgan chiqish ham mumkin).
 */
export const enrollments = pgTable(
  'enrollments',
  {
    id: primaryUuid(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'restrict' }),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    endReason: text('end_reason', { enum: ENROLLMENT_END_REASONS }),
    endNote: text('end_note'),
    /** Doimiy chegirma (BR-18), 0–100; T-203 boshqaradi. */
    discountPercent: integer('discount_percent'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('enrollments_student_id_idx').on(t.studentId),
    index('enrollments_group_id_idx').on(t.groupId),
    check('enrollments_end_reason_check', oneOf(t.endReason, ENROLLMENT_END_REASONS)),
    check('enrollments_dates_check', sql`${t.endDate} IS NULL OR ${t.endDate} >= ${t.startDate}`),
    check('enrollments_end_pair_check', sql`(${t.endDate} IS NULL) = (${t.endReason} IS NULL)`),
    check(
      'enrollments_discount_check',
      sql`${t.discountPercent} IS NULL OR ${t.discountPercent} BETWEEN 0 AND 100`,
    ),
  ],
);

/**
 * Muzlatish (BR-9): ≥ 14 kun, Admin qo'yadi; kredit — oy yopilishida (T-203).
 * Bir enrollment'da kesishuvchi muzlatish yo'q — EXCLUDE (0015).
 */
export const enrollmentFreezes = pgTable(
  'enrollment_freezes',
  {
    id: primaryUuid(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'restrict' }),
    fromDate: date('from_date', { mode: 'string' }).notNull(),
    toDate: date('to_date', { mode: 'string' }).notNull(),
    reason: text('reason').notNull(),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('enrollment_freezes_enrollment_id_idx').on(t.enrollmentId),
    index('enrollment_freezes_approved_by_idx').on(t.approvedBy),
    check('enrollment_freezes_dates_check', sql`${t.toDate} >= ${t.fromDate}`),
  ],
);

export type EnrollmentRow = typeof enrollments.$inferSelect;
export type EnrollmentFreezeRow = typeof enrollmentFreezes.$inferSelect;
