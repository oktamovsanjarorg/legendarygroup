import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser, RoleCode } from '@lg/contracts';
import { type Database, roles, userRoles, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

/** Web panelga kiradigan rollar (02 §7: web — faqat Director/Admin; Ustoz — Mini App). */
export const WEB_ROLES: readonly RoleCode[] = ['director', 'admin'];

export interface StaffUser {
  id: string;
  fullName: string;
  phone: string;
  status: 'active' | 'blocked';
  passwordHash: string | null;
  totpSecret: string | null;
  telegramId: bigint | null;
  permissionsVersion: number;
  roles: RoleCode[];
}

export { maskPhone } from '../../common/audit/pii.js';

/** Standart faol rol: Director bo'lsa — Director (eng keng huquq). */
export const defaultWebRole = (r: readonly RoleCode[]): RoleCode | undefined =>
  WEB_ROLES.find((w) => r.includes(w));

export const toAuthUser = (u: StaffUser, activeRole: RoleCode): AuthUser => ({
  id: u.id,
  fullName: u.fullName,
  phone: u.phone,
  roles: u.roles,
  activeRole,
});

/** Auth uchun foydalanuvchi o'qish (rollar bilan). */
@Injectable()
export class StaffUsers {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  byPhone(phone: string): Promise<StaffUser | undefined> {
    return this.find(eq(users.phone, phone));
  }

  byId(id: string): Promise<StaffUser | undefined> {
    return this.find(eq(users.id, id));
  }

  byTelegramId(telegramId: bigint): Promise<StaffUser | undefined> {
    return this.find(eq(users.telegramId, telegramId));
  }

  private async find(where: ReturnType<typeof eq>): Promise<StaffUser | undefined> {
    const rows = await this.db
      .select({ u: users, role: roles.code })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(where);
    const first = rows[0];
    if (!first) return undefined;
    const { u } = first;
    return {
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      status: u.status,
      passwordHash: u.passwordHash,
      totpSecret: u.totpSecret,
      telegramId: u.telegramId,
      permissionsVersion: u.permissionsVersion,
      roles: rows.flatMap((r) => (r.role ? [r.role] : [])),
    };
  }
}
