import { ROLES } from '@lg/contracts';
import { check, index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { oneOf, primaryUuid, tstz } from './common.js';
import { users } from './users.js';

/**
 * Faqat INSERT. UPDATE/DELETE/TRUNCATE — `lg_app` rolida grant yo'q va trigger
 * bilan bloklangan (migratsiya 0001). Shu sabab FK `ON DELETE SET NULL` emas:
 * audit tarixi bor foydalanuvchini qattiq o'chirib bo'lmaydi (bloklanadi).
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: primaryUuid(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'restrict' }),
    /** Amal paytidagi faol rol (02-roles-permissions.md §1); tizim amallarida null. */
    actorRole: text('actor_role', { enum: ROLES }),
    /** `entity.verb`, masalan `payment.create`. */
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    at: tstz('at').defaultNow().notNull(),
  },
  (t) => [
    check('audit_logs_actor_role_check', oneOf(t.actorRole, ROLES)),
    index('audit_logs_entity_idx').on(t.entity, t.entityId, t.at),
    index('audit_logs_actor_at_idx').on(t.actorId, t.at),
    index('audit_logs_at_idx').on(t.at),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
