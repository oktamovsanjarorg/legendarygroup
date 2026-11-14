import { GROUP_STATUSES, GROUP_TEACHER_ROLES, type GradingConfig } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { branchId, courses, rooms } from './org.js';
import { users } from './users.js';

/**
 * Guruhlar (FR-ORG-3, T-103). Narx va baho sozlamasi kursdan meros (yaratishda nusxa olinadi).
 * O'chirilmaydi: `finished` — oxirgi holat, tarix sifatida qoladi (`archived_at` o'rnida).
 */
export const groups = pgTable(
  'groups',
  {
    id: primaryUuid(),
    branchId: branchId(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'restrict' }),
    monthlyPrice: bigint('monthly_price', { mode: 'bigint' }).notNull(),
    maxStudents: integer('max_students').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    status: text('status', { enum: GROUP_STATUSES }).notNull().default('forming'),
    gradingConfig: jsonb('grading_config').$type<GradingConfig>().notNull(),
    /** Jarima sozlamasi (T-203); `null` — global sozlama. */
    penaltyConfig: jsonb('penalty_config').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('groups_branch_id_idx').on(t.branchId),
    index('groups_course_id_idx').on(t.courseId),
    index('groups_room_id_idx').on(t.roomId),
    index('groups_status_idx').on(t.status),
    uniqueIndex('groups_branch_name_current_uq')
      .on(t.branchId, sql`lower(${t.name})`)
      .where(sql`${t.status} <> 'finished'`),
    check('groups_status_check', oneOf(t.status, GROUP_STATUSES)),
    check('groups_price_check', sql`${t.monthlyPrice} >= 0`),
    check('groups_max_students_check', sql`${t.maxStudents} BETWEEN 1 AND 500`),
    check('groups_dates_check', sql`${t.endDate} IS NULL OR ${t.endDate} >= ${t.startDate}`),
  ],
);

/**
 * Ustoz biriktirish (FR-ORG-6, 02 §3): davr bilan. Bir davrda bitta asosiy ustoz va bir ustoz
 * bir guruhda bir marta — exclusion constraint (`0013` custom migratsiya, `btree_gist`).
 */
export const groupTeachers = pgTable(
  'group_teachers',
  {
    id: primaryUuid(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'restrict' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: text('role', { enum: GROUP_TEACHER_ROLES }).notNull(),
    fromDate: date('from_date', { mode: 'string' }).notNull(),
    toDate: date('to_date', { mode: 'string' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('group_teachers_group_id_idx').on(t.groupId),
    index('group_teachers_teacher_id_idx').on(t.teacherId),
    check('group_teachers_role_check', oneOf(t.role, GROUP_TEACHER_ROLES)),
    check('group_teachers_dates_check', sql`${t.toDate} IS NULL OR ${t.toDate} >= ${t.fromDate}`),
  ],
);

/** Haftalik jadval sloti (FR-ORG-3). Almashtirishda eski slot yopiladi — tarix saqlanadi. */
export const scheduleSlots = pgTable(
  'schedule_slots',
  {
    id: primaryUuid(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'restrict' }),
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    validFrom: date('valid_from', { mode: 'string' }).notNull(),
    validTo: date('valid_to', { mode: 'string' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('schedule_slots_group_id_idx').on(t.groupId),
    check('schedule_slots_weekday_check', sql`${t.weekday} BETWEEN 1 AND 7`),
    check('schedule_slots_time_check', sql`${t.endTime} > ${t.startTime}`),
    check(
      'schedule_slots_dates_check',
      sql`${t.validTo} IS NULL OR ${t.validTo} >= ${t.validFrom}`,
    ),
  ],
);

/**
 * Resurs bandligi (FR-ORG-4): `occupancyFor()` (`@lg/domain`) natijasi — guruh o'zgarganda
 * tranzaksiya ichida qayta quriladi. Xona/ustoz to'qnashuvi — exclusion constraint
 * (`0013`): bir resurs, bir hafta kuni, kesishuvchi vaqt va davr — rad etiladi.
 */
export const scheduleOccupancy = pgTable(
  'schedule_occupancy',
  {
    id: primaryUuid(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'restrict' }),
    slotId: uuid('slot_id')
      .notNull()
      .references(() => scheduleSlots.id, { onDelete: 'cascade' }),
    resourceKind: text('resource_kind', { enum: ['room', 'teacher'] }).notNull(),
    /** `rooms.id` yoki `users.id` (polimorf — FK yo'q). */
    resourceId: uuid('resource_id').notNull(),
    weekday: smallint('weekday').notNull(),
    startMin: integer('start_min').notNull(),
    endMin: integer('end_min').notNull(),
    validFrom: date('valid_from', { mode: 'string' }).notNull(),
    validTo: date('valid_to', { mode: 'string' }),
  },
  (t) => [
    index('schedule_occupancy_group_id_idx').on(t.groupId),
    index('schedule_occupancy_slot_id_idx').on(t.slotId),
    check('schedule_occupancy_kind_check', oneOf(t.resourceKind, ['room', 'teacher'])),
    check('schedule_occupancy_minutes_check', sql`${t.endMin} > ${t.startMin}`),
  ],
);

export type GroupRow = typeof groups.$inferSelect;
export type GroupTeacherRow = typeof groupTeachers.$inferSelect;
export type ScheduleSlotRow = typeof scheduleSlots.$inferSelect;
export type ScheduleOccupancyRow = typeof scheduleOccupancy.$inferSelect;
