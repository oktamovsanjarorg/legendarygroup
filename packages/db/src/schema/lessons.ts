import {
  LESSON_CANCEL_SOURCES,
  LESSON_COMPENSATIONS,
  LESSON_KINDS,
  LESSON_STATUSES,
} from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { groups, scheduleSlots } from './groups.js';
import { rooms } from './org.js';
import { users } from './users.js';

/**
 * Darslar (FR-ORG-5, T-104). `regular` — jadvaldan generatsiya (idempotent: unique
 * `(group_id, date, start_time)`); bekor qilingani ham kalitni band qiladi — qayta yaratilmaydi.
 * Xona/ustoz/guruh vaqt to'qnashuvi — EXCLUDE (0017), bekor qilinganlar hisobga olinmaydi.
 */
export const lessons = pgTable(
  'lessons',
  {
    id: primaryUuid(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'restrict' }),
    /** Generatsiya manbai; slot o'chirilsa (kelajakdagi) — `null`. */
    slotId: uuid('slot_id').references(() => scheduleSlots.id, { onDelete: 'set null' }),
    date: date('date', { mode: 'string' }).notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'restrict' }),
    /** Haqiqiy o'tadigan/o'tgan ustoz (asosiy yoki o'rinbosar). */
    teacherId: uuid('teacher_id').references(() => users.id, { onDelete: 'restrict' }),
    /** Qo'lda o'zgartirilgan — jadval qayta hisoblanganda ustiga yozilmaydi. */
    isSubstitute: boolean('is_substitute').notNull().default(false),
    roomOverridden: boolean('room_overridden').notNull().default(false),
    status: text('status', { enum: LESSON_STATUSES }).notNull().default('scheduled'),
    kind: text('kind', { enum: LESSON_KINDS }).notNull().default('regular'),
    cancelReason: text('cancel_reason'),
    cancelSource: text('cancel_source', { enum: LESSON_CANCEL_SOURCES }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    /** BR-5, Q-16: `null` — hali tanlanmagan (oy yopilishida kredit). */
    compensation: text('compensation', { enum: LESSON_COMPENSATIONS }),
    makeupForLessonId: uuid('makeup_for_lesson_id').references((): AnyPgColumn => lessons.id, {
      onDelete: 'restrict',
    }),
    topic: text('topic'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('lessons_group_date_start_uq').on(t.groupId, t.date, t.startTime),
    uniqueIndex('lessons_makeup_for_uq').on(t.makeupForLessonId),
    index('lessons_date_idx').on(t.date),
    index('lessons_teacher_date_idx').on(t.teacherId, t.date),
    index('lessons_room_date_idx').on(t.roomId, t.date),
    index('lessons_slot_id_idx').on(t.slotId),
    check('lessons_status_check', oneOf(t.status, LESSON_STATUSES)),
    check('lessons_kind_check', oneOf(t.kind, LESSON_KINDS)),
    check('lessons_cancel_source_check', oneOf(t.cancelSource, LESSON_CANCEL_SOURCES)),
    check('lessons_compensation_check', oneOf(t.compensation, LESSON_COMPENSATIONS)),
    check('lessons_time_check', sql`${t.endTime} > ${t.startTime}`),
    check(
      'lessons_cancel_pair_check',
      sql`(${t.status} = 'cancelled') = (${t.cancelSource} IS NOT NULL AND ${t.cancelledAt} IS NOT NULL)`,
    ),
    check(
      'lessons_compensation_cancelled_check',
      sql`${t.compensation} IS NULL OR ${t.status} = 'cancelled'`,
    ),
    check(
      'lessons_makeup_pair_check',
      sql`(${t.kind} = 'makeup') = (${t.makeupForLessonId} IS NOT NULL)`,
    ),
  ],
);

/** Bayram kunlari (FR-ORG-5): shu kunlarda dars generatsiya qilinmaydi (BR-3). */
export const holidays = pgTable('holidays', {
  date: date('date', { mode: 'string' }).primaryKey(),
  name: text('name').notNull(),
  createdAt: createdAt(),
});

export type LessonRow = typeof lessons.$inferSelect;
export type HolidayRow = typeof holidays.$inferSelect;
