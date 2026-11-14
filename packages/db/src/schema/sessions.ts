import { ROLES } from '@lg/contracts';
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, tstz } from './common.js';
import { users } from './users.js';

export const sessions = pgTable(
  'sessions',
  {
    id: primaryUuid(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeRole: text('active_role', { enum: ROLES }).notNull(),
    /** SHA-256 hash; token o'zi saqlanmaydi. */
    refreshTokenHash: text('refresh_token_hash').notNull().unique(),
    /** Refresh token rotatsiyasi oilasi — qayta ishlatish aniqlansa butun oila bekor qilinadi. */
    familyId: uuid('family_id').notNull(),
    device: text('device'),
    ip: text('ip'),
    expiresAt: tstz('expires_at').notNull(),
    revokedAt: tstz('revoked_at'),
    /** Rotatsiyada almashtirilgan (o'g'irlikni logout'dan farqlash uchun, T-006). */
    replacedAt: tstz('replaced_at'),
    createdAt: createdAt(),
  },
  (t) => [
    check('sessions_active_role_check', oneOf(t.activeRole, ROLES)),
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_family_id_idx').on(t.familyId),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
