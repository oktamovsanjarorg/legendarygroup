import { TEST_STATUSES, type TestSection, type TestSectionScore } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { groups } from './groups.js';
import { branches } from './org.js';
import { students } from './students.js';
import { files } from './system.js';
import { users } from './users.js';

export const tests = pgTable(
  'tests',
  {
    id: primaryUuid(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    date: date('date').notNull(),
    maxScore: integer('max_score').notNull(),
    sections: jsonb('sections').$type<TestSection[]>().notNull().default([]),
    status: text('status', { enum: TEST_STATUSES }).notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('tests_group_idx').on(t.groupId),
    index('tests_branch_idx').on(t.branchId),
    index('tests_date_idx').on(t.date),
    check('tests_status_check', oneOf(t.status, TEST_STATUSES)),
    check('tests_max_score_check', sql`${t.maxScore} > 0`),
  ],
);

export const testResults = pgTable(
  'test_results',
  {
    id: primaryUuid(),
    testId: uuid('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    sectionScores: jsonb('section_scores').$type<TestSectionScore[]>().notNull().default([]),
    version: integer('version').notNull().default(1),
    clientMutationId: uuid('client_mutation_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('test_results_test_student_idx').on(t.testId, t.studentId),
    index('test_results_test_idx').on(t.testId),
    index('test_results_student_idx').on(t.studentId),
    check('test_results_score_check', sql`${t.score} >= 0`),
  ],
);

export const imports = pgTable(
  'imports',
  {
    id: primaryUuid(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    kind: text('kind').notNull().default('test_results'),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'set null' }),
    mapping: jsonb('mapping').notNull().default({}),
    status: text('status').notNull().default('completed'),
    report: jsonb('report').notNull().default({}),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('imports_branch_idx').on(t.branchId),
    index('imports_created_by_idx').on(t.createdBy),
  ],
);

export type TestRow = typeof tests.$inferSelect;
export type NewTestRow = typeof tests.$inferInsert;
export type TestResultRow = typeof testResults.$inferSelect;
export type NewTestResultRow = typeof testResults.$inferInsert;
export type ImportRow = typeof imports.$inferSelect;
export type NewImportRow = typeof imports.$inferInsert;
