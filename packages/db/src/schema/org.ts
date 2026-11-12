import { DEFAULT_BRANCH_ID, GRADE_SCALES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';

/**
 * Filiallar (05 konvensiyasi, T-102). Hozir bitta qator — migratsiya `DEFAULT_BRANCH_ID` bilan
 * yaratadi; biznes jadvallar `branch_id` FK oladi (standart — yagona filial).
 */
export const branches = pgTable('branches', {
  id: primaryUuid(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Har biznes jadval uchun: FK → `branches`, standart — yagona filial. */
const branchId = () =>
  uuid('branch_id')
    .notNull()
    .default(DEFAULT_BRANCH_ID)
    .references(() => branches.id, { onDelete: 'restrict' });

/** Kurslar (FR-ORG-1). Arxivlash — `archived_at` (fizik DELETE yo'q). */
export const courses = pgTable(
  'courses',
  {
    id: primaryUuid(),
    branchId: branchId(),
    name: text('name').notNull(),
    description: text('description'),
    levels: text('levels')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    defaultMonthlyPrice: bigint('default_monthly_price', { mode: 'bigint' }).notNull(),
    lessonDurationMin: integer('lesson_duration_min').notNull(),
    durationMonths: integer('duration_months'),
    gradeScale: text('grade_scale', { enum: GRADE_SCALES }).notNull().default('0_5'),
    archivedAt: tstz('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('courses_branch_id_idx').on(t.branchId),
    // Faol kurs nomi filial ichida takrorlanmaydi (katta-kichik harf farqsiz); arxivdagi — mumkin.
    uniqueIndex('courses_branch_name_active_uq')
      .on(t.branchId, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} IS NULL`),
    check('courses_grade_scale_check', oneOf(t.gradeScale, GRADE_SCALES)),
    check('courses_price_check', sql`${t.defaultMonthlyPrice} >= 0`),
    check('courses_lesson_duration_check', sql`${t.lessonDurationMin} BETWEEN 15 AND 480`),
    check('courses_duration_months_check', sql`${t.durationMonths} BETWEEN 1 AND 60`),
  ],
);

/** Xonalar (FR-ORG-2). Sig'im — guruh `max_students` uchun ogohlantirish manbai (T-103). */
export const rooms = pgTable(
  'rooms',
  {
    id: primaryUuid(),
    branchId: branchId(),
    name: text('name').notNull(),
    capacity: integer('capacity').notNull(),
    archivedAt: tstz('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('rooms_branch_id_idx').on(t.branchId),
    uniqueIndex('rooms_branch_name_active_uq')
      .on(t.branchId, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} IS NULL`),
    check('rooms_capacity_check', sql`${t.capacity} BETWEEN 1 AND 500`),
  ],
);

export type Branch = typeof branches.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
