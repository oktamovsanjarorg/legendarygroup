import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, primaryUuid, tstz, updatedAt } from './common.js';
import { users } from './users.js';

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  rules: jsonb('rules').$type<Record<string, unknown>>(),
  updatedAt: updatedAt(),
});

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: primaryUuid(),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
    processedAt: tstz('processed_at'),
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [
    // Worker faqat ishlanmaganlarni oladi — qisman indeks kichik va tez.
    index('outbox_events_pending_idx')
      .on(t.createdAt)
      .where(sql`${t.processedAt} IS NULL`),
  ],
);

export const files = pgTable(
  'files',
  {
    id: primaryUuid(),
    s3Key: text('s3_key').notNull().unique(),
    mime: text('mime').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    sha256: text('sha256').notNull(),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    purpose: text('purpose').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check('files_size_check', sql`${t.size} >= 0`),
    check('files_sha256_check', sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    index('files_uploaded_by_idx').on(t.uploadedBy),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    route: text('route').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: jsonb('response_body').$type<unknown>(),
    createdAt: createdAt(),
    expiresAt: tstz('expires_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.route] }),
    index('idempotency_keys_expires_at_idx').on(t.expiresAt),
    index('idempotency_keys_user_id_idx').on(t.userId),
  ],
);

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;
export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;
