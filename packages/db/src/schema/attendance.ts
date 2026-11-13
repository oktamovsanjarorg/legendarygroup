import { ATTENDANCE_STATUSES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { lessons } from './lessons.js';
import { students } from './students.js';
import { users } from './users.js';

export const attendance = pgTable(
  'attendance',
  {
    id: primaryUuid(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ATTENDANCE_STATUSES }).notNull(),
    lateMinutes: integer('late_minutes'),
    note: text('note'),
    markedBy: uuid('marked_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
    clientMutationId: text('client_mutation_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('attendance_lesson_student_idx').on(t.lessonId, t.studentId),
    index('attendance_lesson_idx').on(t.lessonId),
    index('attendance_student_idx').on(t.studentId),
    check('attendance_status_check', oneOf(t.status, ATTENDANCE_STATUSES)),
    check(
      'attendance_late_check',
      sql`${t.status} != 'late' OR (${t.lateMinutes} IS NOT NULL AND ${t.lateMinutes} > 0)`,
    ),
  ],
);

export type AttendanceRow = typeof attendance.$inferSelect;
export type NewAttendanceRow = typeof attendance.$inferInsert;
