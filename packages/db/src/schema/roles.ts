import { ROLES } from '@lg/contracts';
import { boolean, check, index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { users } from './users.js';

export const roles = pgTable(
  'roles',
  {
    id: primaryUuid(),
    code: text('code', { enum: ROLES }).notNull().unique(),
    name: text('name').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('roles_code_check', oneOf(t.code, ROLES))],
);

export const permissions = pgTable('permissions', {
  code: text('code').primaryKey(),
  description: text('description').notNull(),
  createdAt: createdAt(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionCode: text('permission_code')
      .notNull()
      .references(() => permissions.code, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionCode] })],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    // "Oxirgi faol Director" tekshiruvi rol bo'yicha qidiradi.
    index('user_roles_role_id_idx').on(t.roleId),
  ],
);

/**
 * Foydalanuvchi bo'yicha ruxsat override'i (02 §4 "Override qoidasi", T-008):
 * `granted=true` — faqat Admin'ga delegatsiya qilinadiganlar; `granted=false` — cheklash.
 * Qoidalar `@lg/domain` `overrideError()`da; o'zgarish → `users.permissions_version + 1`.
 */
export const userPermissionOverrides = pgTable(
  'user_permission_overrides',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permissionCode: text('permission_code')
      .notNull()
      .references(() => permissions.code, { onDelete: 'cascade' }),
    granted: boolean('granted').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.permissionCode] })],
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type PermissionRecord = typeof permissions.$inferSelect;
export type NewPermissionRecord = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type UserPermissionOverride = typeof userPermissionOverrides.$inferSelect;
