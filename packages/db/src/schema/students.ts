import { ACQUISITION_SOURCES, GENDERS, GUARDIAN_RELATIONS } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';
import { branchId } from './org.js';
import { files } from './system.js';
import { users } from './users.js';

const E164 = (col: unknown) => sql`${col} ~ '^\\+[1-9][0-9]{6,14}$'`;

/**
 * O'quvchilar (FR-STU-1, T-105). `code` — inson o'qiy oladigan raqam (identity, 10001 dan).
 * `search_name` — `normalizeUz(full_name)` (ilova yozadi), ustida `pg_trgm` GIN indeks.
 * O'chirilmaydi — faqat arxivlanadi (FR-STU-6).
 */
export const students = pgTable(
  'students',
  {
    id: primaryUuid(),
    branchId: branchId(),
    code: integer('code').generatedAlwaysAsIdentity({ startWith: 10001 }).notNull().unique(),
    fullName: text('full_name').notNull(),
    searchName: text('search_name').notNull(),
    birthDate: date('birth_date', { mode: 'string' }),
    gender: text('gender', { enum: GENDERS }),
    phone: text('phone'),
    school: text('school'),
    grade: text('grade'),
    source: text('source', { enum: ACQUISITION_SOURCES }),
    notes: text('notes'),
    photoFileId: uuid('photo_file_id').references(() => files.id, { onDelete: 'restrict' }),
    archivedAt: tstz('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('students_branch_id_idx').on(t.branchId),
    index('students_photo_file_id_idx').on(t.photoFileId),
    index('students_created_at_id_idx').on(t.createdAt.desc(), t.id.desc()),
    index('students_search_name_trgm_idx').using('gin', sql`${t.searchName} gin_trgm_ops`),
    index('students_phone_idx').on(t.phone),
    // Dublikat ogohlantirishi (ism + tug'ilgan sana) uchun.
    index('students_dup_idx').on(t.searchName, t.birthDate),
    check('students_gender_check', oneOf(t.gender, GENDERS)),
    check('students_source_check', oneOf(t.source, ACQUISITION_SOURCES)),
    check('students_phone_e164_check', E164(t.phone)),
  ],
);

/**
 * Ota-onalar (FR-STU-2). `phone` — bog'lash kaliti (bot orqali kirganda `user_id` to'ldiriladi,
 * T-110). Bitta ota-onada bir nechta farzand bo'lishi mumkin (FR-AUTH-6).
 */
export const guardians = pgTable(
  'guardians',
  {
    id: primaryUuid(),
    branchId: branchId(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('guardians_phone_uq').on(t.phone),
    uniqueIndex('guardians_user_id_uq').on(t.userId),
    index('guardians_branch_id_idx').on(t.branchId),
    check('guardians_phone_e164_check', E164(t.phone)),
  ],
);

/** O'quvchi ↔ ota-ona (FR-AUTH-6: ko'pga-ko'p). Uzilsa — kirish darhol yopiladi (02 §3). */
export const studentGuardians = pgTable(
  'student_guardians',
  {
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'restrict' }),
    relation: text('relation', { enum: GUARDIAN_RELATIONS }).notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    notify: boolean('notify').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.studentId, t.guardianId] }),
    index('student_guardians_guardian_id_idx').on(t.guardianId),
    // Har o'quvchida ko'pi bilan bitta asosiy ota-ona.
    uniqueIndex('student_guardians_one_primary_uq')
      .on(t.studentId)
      .where(sql`${t.isPrimary}`),
    check('student_guardians_relation_check', oneOf(t.relation, GUARDIAN_RELATIONS)),
  ],
);

export type StudentRow = typeof students.$inferSelect;
export type GuardianRow = typeof guardians.$inferSelect;
export type StudentGuardianRow = typeof studentGuardians.$inferSelect;
