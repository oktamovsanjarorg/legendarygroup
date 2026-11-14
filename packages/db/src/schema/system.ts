import { FEEDBACK_PLATFORMS, FEEDBACK_TYPES } from '@lg/contracts';
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
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';
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

/**
 * Transactional outbox (03 §4): event biznes tranzaksiyasi bilan birga yoziladi, worker relay
 * uni navbatga (BullMQ, `jobId = id`) uzatadi. Relay xatosida backoff `next_attempt_at` bilan;
 * 10 urinishdan keyin `failed_at` (dead-letter) + alert.
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: primaryUuid(),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
    processedAt: tstz('processed_at'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: tstz('next_attempt_at').defaultNow().notNull(),
    lastError: text('last_error'),
    failedAt: tstz('failed_at'),
  },
  (t) => [
    // Relay faqat navbatdagilarni oladi — qisman indeks kichik va tez.
    index('outbox_events_due_idx')
      .on(t.nextAttemptAt)
      .where(sql`${t.processedAt} IS NULL AND ${t.failedAt} IS NULL`),
  ],
);

/**
 * Iste'molchi dedup'i (T-005): (consumer, event_id) bir marta. Handler o'z yozuvlarini shu
 * belgi bilan bitta tranzaksiyada qiladi — qayta yetkazilgan event ikki marta ishlanmaydi.
 */
export const outboxConsumptions = pgTable(
  'outbox_consumptions',
  {
    consumer: text('consumer').notNull(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => outboxEvents.id, { onDelete: 'cascade' }),
    processedAt: tstz('processed_at').defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.consumer, t.eventId] }),
    index('outbox_consumptions_event_idx').on(t.eventId),
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

/**
 * `Idempotency-Key` (T-004). Kalit foydalanuvchiga bog'langan: (key, route, user_id) — anonim
 * so'rovlarda user_id NULL, `NULLS NOT DISTINCT` bilan baribir yagona.
 * `response_status IS NULL` — so'rov hali bajarilmoqda (band qilingan).
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    route: text('route').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<unknown>(),
    createdAt: createdAt(),
    expiresAt: tstz('expires_at').notNull(),
  },
  (t) => [
    unique('idempotency_keys_scope_uq').on(t.key, t.route, t.userId).nullsNotDistinct(),
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
export type OutboxConsumption = typeof outboxConsumptions.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;

/**
 * Ichki fikr-mulohaza va xatolik hisobotlari (FR-SYS-4 / T-118).
 * Har bir ekrandan kelgan taklif/xatolik saqlanadi va Telegram alert outbox yaratiladi.
 */
export const feedbacks = pgTable(
  'feedbacks',
  {
    id: primaryUuid(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    type: text('type', { enum: FEEDBACK_TYPES }).notNull().default('general'),
    text: text('text').notNull(),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'set null' }),
    screen: text('screen'),
    appVersion: text('app_version'),
    platform: text('platform', { enum: FEEDBACK_PLATFORMS }).notNull().default('web'),
    requestId: text('request_id'),
    clientContext: jsonb('client_context').$type<Record<string, unknown>>(),
    status: text('status').notNull().default('received'),
    createdAt: createdAt(),
  },
  (t) => [
    index('feedbacks_user_id_idx').on(t.userId),
    index('feedbacks_created_at_idx').on(t.createdAt),
    index('feedbacks_type_idx').on(t.type),
    check('feedbacks_type_check', oneOf(t.type, FEEDBACK_TYPES)),
    check('feedbacks_platform_check', oneOf(t.platform, FEEDBACK_PLATFORMS)),
  ],
);

export type FeedbackRow = typeof feedbacks.$inferSelect;
export type NewFeedbackRow = typeof feedbacks.$inferInsert;
