import { APPROVAL_REQUEST_STATUSES, APPROVAL_REQUEST_TYPES } from '@lg/contracts';
import { check, index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';
import { branchId } from './org.js';
import { users } from './users.js';

export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: primaryUuid(),
    branchId: branchId(),
    type: text('type', { enum: APPROVAL_REQUEST_TYPES }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    reason: text('reason').notNull(),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: text('status', { enum: APPROVAL_REQUEST_STATUSES }).notNull().default('pending'),
    decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'restrict' }),
    decidedAt: tstz('decided_at'),
    decisionNote: text('decision_note'),
    expiresAt: tstz('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('approval_requests_branch_id_idx').on(t.branchId),
    index('approval_requests_status_idx').on(t.status),
    index('approval_requests_requested_by_idx').on(t.requestedBy),
    index('approval_requests_expires_at_idx').on(t.expiresAt),
    check('approval_requests_type_check', oneOf(t.type, APPROVAL_REQUEST_TYPES)),
    check('approval_requests_status_check', oneOf(t.status, APPROVAL_REQUEST_STATUSES)),
  ],
);

export type ApprovalRequestRow = typeof approvalRequests.$inferSelect;
export type NewApprovalRequestRow = typeof approvalRequests.$inferInsert;
