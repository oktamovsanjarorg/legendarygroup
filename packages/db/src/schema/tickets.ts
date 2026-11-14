import { TICKET_PRIORITIES, TICKET_STATUSES } from '@lg/contracts';
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';
import { branchId } from './org.js';
import { students } from './students.js';
import { users } from './users.js';

export const tickets = pgTable(
  'tickets',
  {
    id: primaryUuid(),
    branchId: branchId(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id').references(() => students.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    status: text('status', { enum: TICKET_STATUSES }).notNull().default('open'),
    priority: text('priority', { enum: TICKET_PRIORITIES }).notNull().default('normal'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    lastMessageAt: tstz('last_message_at').notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('tickets_branch_id_idx').on(t.branchId),
    index('tickets_author_id_idx').on(t.authorId),
    index('tickets_student_id_idx').on(t.studentId),
    index('tickets_assigned_to_idx').on(t.assignedTo),
    index('tickets_status_priority_idx').on(t.status, t.priority),
    index('tickets_last_message_idx').on(t.lastMessageAt),
    check('tickets_status_check', oneOf(t.status, TICKET_STATUSES)),
    check('tickets_priority_check', oneOf(t.priority, TICKET_PRIORITIES)),
  ],
);

export const ticketMessages = pgTable(
  'ticket_messages',
  {
    id: primaryUuid(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    fileUrl: text('file_url'),
    createdAt: createdAt(),
  },
  (t) => [
    index('ticket_messages_ticket_id_idx').on(t.ticketId),
    index('ticket_messages_author_id_idx').on(t.authorId),
  ],
);

export type TicketRow = typeof tickets.$inferSelect;
export type NewTicketRow = typeof tickets.$inferInsert;
export type TicketMessageRow = typeof ticketMessages.$inferSelect;
export type NewTicketMessageRow = typeof ticketMessages.$inferInsert;
