import {
  ANNOUNCEMENT_FILE_TYPES,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TARGET_TYPES,
  NOTIFICATION_STATUSES,
} from '@lg/contracts';
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';
import { notifications } from './notifications.js';
import { branchId } from './org.js';
import { users } from './users.js';

export const announcements = pgTable(
  'announcements',
  {
    id: primaryUuid(),
    branchId: branchId(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    targetType: text('target_type', { enum: ANNOUNCEMENT_TARGET_TYPES }).notNull(),
    targetId: uuid('target_id'),
    fileUrl: text('file_url'),
    fileType: text('file_type', { enum: ANNOUNCEMENT_FILE_TYPES }),
    status: text('status', { enum: ANNOUNCEMENT_STATUSES }).notNull().default('draft'),
    scheduledAt: tstz('scheduled_at'),
    sentAt: tstz('sent_at'),
    totalRecipients: integer('total_recipients').notNull().default(0),
    sentCount: integer('sent_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    blockedCount: integer('blocked_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('announcements_branch_id_idx').on(t.branchId),
    index('announcements_author_id_idx').on(t.authorId),
    index('announcements_created_idx').on(t.createdAt),
    check('announcements_target_type_check', oneOf(t.targetType, ANNOUNCEMENT_TARGET_TYPES)),
    check('announcements_status_check', oneOf(t.status, ANNOUNCEMENT_STATUSES)),
  ],
);

export const announcementRecipients = pgTable(
  'announcement_recipients',
  {
    id: primaryUuid(),
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    notificationId: uuid('notification_id').references(() => notifications.id, {
      onDelete: 'set null',
    }),
    recipientName: text('recipient_name').notNull(),
    recipientPhone: text('recipient_phone'),
    channel: text('channel').notNull().default('telegram'),
    status: text('status', { enum: NOTIFICATION_STATUSES }).notNull().default('queued'),
    sentAt: tstz('sent_at'),
    failedReason: text('failed_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('announcement_recipients_announcement_id_idx').on(t.announcementId),
    index('announcement_recipients_user_id_idx').on(t.userId),
    index('announcement_recipients_status_idx').on(t.status),
    uniqueIndex('announcement_recipients_unique_user_idx').on(t.announcementId, t.userId),
    check('announcement_recipients_status_check', oneOf(t.status, NOTIFICATION_STATUSES)),
  ],
);

export type AnnouncementRow = typeof announcements.$inferSelect;
export type NewAnnouncementRow = typeof announcements.$inferInsert;
export type AnnouncementRecipientRow = typeof announcementRecipients.$inferSelect;
export type NewAnnouncementRecipientRow = typeof announcementRecipients.$inferInsert;
