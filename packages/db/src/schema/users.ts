import { USER_STATUSES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import { bigint, check, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz, updatedAt } from './common.js';

export const users = pgTable(
  'users',
  {
    id: primaryUuid(),
    fullName: text('full_name').notNull(),
    /** E.164: `+998901234567`. */
    phone: text('phone').notNull().unique(),
    telegramId: bigint('telegram_id', { mode: 'bigint' }).unique(),
    telegramUsername: text('telegram_username'),
    /** Faqat xodimlar uchun (argon2id). */
    passwordHash: text('password_hash'),
    /** Ilova darajasida shifrlangan (AES-GCM) — ochiq matn saqlanmaydi. */
    totpSecret: text('totp_secret'),
    status: text('status', { enum: USER_STATUSES }).notNull().default('active'),
    lastLoginAt: tstz('last_login_at'),
    permissionsVersion: integer('permissions_version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('users_status_check', oneOf(t.status, USER_STATUSES)),
    check('users_phone_e164_check', sql`${t.phone} ~ '^\\+[1-9][0-9]{6,14}$'`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
