import { EXPENSE_CATEGORIES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import { bigint, check, date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, primaryUuid, updatedAt } from './common.js';
import { branches } from './org.js';
import { files } from './system.js';
import { users } from './users.js';

export const expenses = pgTable(
  'expenses',
  {
    id: primaryUuid(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    category: text('category', { enum: EXPENSE_CATEGORIES }).notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    note: text('note'),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('expenses_branch_date_idx').on(t.branchId, t.date),
    index('expenses_category_date_idx').on(t.category, t.date),
    check('expenses_amount_positive_chk', sql`${t.amount} > 0`),
  ],
);

export type ExpenseRow = typeof expenses.$inferSelect;
export type NewExpenseRow = typeof expenses.$inferInsert;
