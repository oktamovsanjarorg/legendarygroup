import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, NOTIFICATION_TYPES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';
import { branchId } from './org.js';
import { users } from './users.js';

export const notifications = pgTable(
  'notifications',
  {
    id: primaryUuid(),
    branchId: branchId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: NOTIFICATION_TYPES }).notNull(),
    channel: text('channel', { enum: NOTIFICATION_CHANNELS }).notNull().default('telegram'),
    recipient: text('recipient').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    dedupeKey: text('dedupe_key'),
    status: text('status', { enum: NOTIFICATION_STATUSES }).notNull().default('queued'),
    jobId: text('job_id'),
    attempts: integer('attempts').notNull().default(0),
    failedReason: text('failed_reason'),
    sentAt: tstz('sent_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('notifications_user_id_idx').on(t.userId),
    index('notifications_branch_id_idx').on(t.branchId),
    index('notifications_status_created_idx').on(t.status, t.createdAt),
    index('notifications_type_idx').on(t.type),
    uniqueIndex('notifications_dedupe_key_idx').on(t.dedupeKey),
    check('notifications_type_check', oneOf(t.type, NOTIFICATION_TYPES)),
    check('notifications_channel_check', oneOf(t.channel, NOTIFICATION_CHANNELS)),
    check('notifications_status_check', oneOf(t.status, NOTIFICATION_STATUSES)),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: NOTIFICATION_TYPES }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.type] }),
    check('notification_preferences_type_check', oneOf(t.type, NOTIFICATION_TYPES)),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type NotificationPreferenceRow = typeof notificationPreferences.$inferSelect;
