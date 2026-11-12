import { Inject, Injectable } from '@nestjs/common';
import { type Database, roles, type Transaction, userRoles, users } from '@lg/db';
import { and, eq, inArray } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

/**
 * Boshqa modullar uchun xodimlar katalogi (03 §4 — `users`/`user_roles` jadvallariga faqat
 * shu public servis orqali): ism, faol ustozmi.
 */
@Injectable()
export class StaffDirectoryService {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async namesOf(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, [...new Set(ids)]));
    return new Map(rows.map((r) => [r.id, r.fullName]));
  }

  /** Faol (bloklanmagan) va `teacher` roli bor. */
  async isActiveTeacher(userId: string, tx: Database | Transaction = this.db): Promise<boolean> {
    const [row] = await tx
      .select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.id, userId), eq(users.status, 'active'), eq(roles.code, 'teacher')));
    return Boolean(row);
  }
}
