import { check, index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz } from './common.js';
import { users } from './users.js';

/** TOTP zaxira kodlari (T-006): faqat hash; har kod bir marta (`used_at`). */
export const userBackupCodes = pgTable(
  'user_backup_codes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    usedAt: tstz('used_at'),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.codeHash] })],
);

/**
 * Taklif kanali (T-101): `web` — parol + TOTP (`/invite/<token>`, Director/Admin);
 * `bot` — telefon ulashish orqali `telegram_id` bog'lash (Ustoz). Kanal aralashmaydi —
 * bot tokeni bilan web parol o'rnatib bo'lmaydi.
 */
export const INVITE_CHANNELS = ['web', 'bot'] as const;
export type InviteChannel = (typeof INVITE_CHANNELS)[number];

/**
 * Xodim/Director sozlash havolasi (05-data-model.md): bir martalik, 24 soat.
 * Token o'zi saqlanmaydi — faqat SHA-256 hash.
 */
export const staffInvites = pgTable(
  'staff_invites',
  {
    id: primaryUuid(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    // Expand: mavjud qatorlar — `web` (T-006/T-008 takliflari faqat web edi).
    channel: text('channel', { enum: INVITE_CHANNELS }).notNull().default('web'),
    expiresAt: tstz('expires_at').notNull(),
    usedAt: tstz('used_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('staff_invites_user_id_idx').on(t.userId),
    check('staff_invites_channel_check', oneOf(t.channel, INVITE_CHANNELS)),
  ],
);

export type UserBackupCode = typeof userBackupCodes.$inferSelect;
export type StaffInvite = typeof staffInvites.$inferSelect;
