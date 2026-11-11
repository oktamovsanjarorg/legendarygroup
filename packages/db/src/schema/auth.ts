import { index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, primaryUuid, tstz } from './common.js';
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
    expiresAt: tstz('expires_at').notNull(),
    usedAt: tstz('used_at'),
    createdAt: createdAt(),
  },
  (t) => [index('staff_invites_user_id_idx').on(t.userId)],
);

export type UserBackupCode = typeof userBackupCodes.$inferSelect;
export type StaffInvite = typeof staffInvites.$inferSelect;
