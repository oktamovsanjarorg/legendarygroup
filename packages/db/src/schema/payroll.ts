import {
  PAYROLL_BASES,
  PAYROLL_ITEM_KINDS,
  PAYROLL_RUN_STATUSES,
  TEACHER_CONTRACT_TYPES,
} from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
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
import { users } from './users.js';

export const teacherContracts = pgTable(
  'teacher_contracts',
  {
    id: primaryUuid(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
    type: text('type', { enum: TEACHER_CONTRACT_TYPES }).notNull(),
    fixedAmount: bigint('fixed_amount', { mode: 'bigint' }).notNull().default(0n),
    percentBp: integer('percent_bp').notNull().default(0),
    perLessonRate: bigint('per_lesson_rate', { mode: 'bigint' }).notNull().default(0n),
    base: text('base', { enum: PAYROLL_BASES }).notNull().default('collected'),
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('teacher_contracts_teacher_idx').on(t.teacherId),
    index('teacher_contracts_branch_idx').on(t.branchId),
    check('teacher_contracts_type_check', oneOf(t.type, TEACHER_CONTRACT_TYPES)),
    check('teacher_contracts_base_check', oneOf(t.base, PAYROLL_BASES)),
    check('teacher_contracts_percent_check', sql`${t.percentBp} >= 0 AND ${t.percentBp} <= 10000`),
  ],
);

export const payrollRuns = pgTable(
  'payroll_runs',
  {
    id: primaryUuid(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    period: text('period').notNull(),
    status: text('status', { enum: PAYROLL_RUN_STATUSES }).notNull().default('draft'),
    totalAmount: bigint('total_amount', { mode: 'bigint' }).notNull().default(0n),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    paidBy: uuid('paid_by').references(() => users.id, { onDelete: 'set null' }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('payroll_runs_branch_period_idx').on(t.branchId, t.period),
    index('payroll_runs_period_idx').on(t.period),
    check('payroll_runs_status_check', oneOf(t.status, PAYROLL_RUN_STATUSES)),
  ],
);

export const payrollItems = pgTable(
  'payroll_items',
  {
    id: primaryUuid(),
    runId: uuid('run_id')
      .notNull()
      .references(() => payrollRuns.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: text('kind', { enum: PAYROLL_ITEM_KINDS }).notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    details: jsonb('details').notNull().default({}),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    index('payroll_items_run_idx').on(t.runId),
    index('payroll_items_teacher_idx').on(t.teacherId),
    check('payroll_items_kind_check', oneOf(t.kind, PAYROLL_ITEM_KINDS)),
  ],
);

export const teacherAdvances = pgTable(
  'teacher_advances',
  {
    id: primaryUuid(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    givenAt: date('given_at').notNull(),
    deductedInRunId: uuid('deducted_in_run_id').references(() => payrollRuns.id, {
      onDelete: 'set null',
    }),
    note: text('note'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('teacher_advances_teacher_idx').on(t.teacherId),
    index('teacher_advances_deducted_idx').on(t.deductedInRunId),
    check('teacher_advances_amount_check', sql`${t.amount} > 0`),
  ],
);

export type TeacherContractRow = typeof teacherContracts.$inferSelect;
export type NewTeacherContractRow = typeof teacherContracts.$inferInsert;
export type PayrollRunRow = typeof payrollRuns.$inferSelect;
export type NewPayrollRunRow = typeof payrollRuns.$inferInsert;
export type PayrollItemRow = typeof payrollItems.$inferSelect;
export type NewPayrollItemRow = typeof payrollItems.$inferInsert;
export type TeacherAdvanceRow = typeof teacherAdvances.$inferSelect;
export type NewTeacherAdvanceRow = typeof teacherAdvances.$inferInsert;
