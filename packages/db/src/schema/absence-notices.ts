import { ABSENCE_NOTICE_STATUSES } from '@lg/contracts';
import { check, date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { branchId } from './org.js';
import { students } from './students.js';
import { users } from './users.js';

export const absenceNotices = pgTable(
  'absence_notices',
  {
    id: primaryUuid(),
    branchId: branchId(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    guardianUserId: uuid('guardian_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    reason: text('reason').notNull(),
    status: text('status', { enum: ABSENCE_NOTICE_STATUSES }).notNull().default('pending'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('absence_notices_branch_id_idx').on(t.branchId),
    index('absence_notices_student_date_idx').on(t.studentId, t.date),
    index('absence_notices_guardian_idx').on(t.guardianUserId),
    index('absence_notices_status_idx').on(t.status),
    check('absence_notices_status_check', oneOf(t.status, ABSENCE_NOTICE_STATUSES)),
  ],
);

export type AbsenceNoticeRow = typeof absenceNotices.$inferSelect;
export type NewAbsenceNoticeRow = typeof absenceNotices.$inferInsert;
