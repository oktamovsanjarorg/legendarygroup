import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { isPermission, type RoleCode, type StaffDetail, type StaffListItem } from '@lg/contracts';
import {
  type Database,
  roles,
  staffInvites,
  userPermissionOverrides,
  userRoles,
  users,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, asc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { neededChannel } from './staff.service.js';

/** Xodim rollari (ota-ona — xodim emas). */
const STAFF_CODES: RoleCode[] = ['director', 'admin', 'teacher'];

type Row = typeof users.$inferSelect;

/** Xodimlar ro'yxati va tafsiloti (W-28). Xodimlar soni kichik (≤ ~100) — sahifalashsiz. */
@Injectable()
export class StaffQueryService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async list(): Promise<StaffListItem[]> {
    const rows = await this.db
      .select({ user: users, code: roles.code })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .orderBy(asc(users.fullName));
    const byUser = new Map<string, { user: Row; codes: RoleCode[] }>();
    for (const r of rows) {
      const e = byUser.get(r.user.id) ?? { user: r.user, codes: [] };
      e.codes.push(r.code);
      byUser.set(r.user.id, e);
    }
    const staff = [...byUser.values()].filter((e) => e.codes.some((c) => STAFF_CODES.includes(c)));
    const overrides = staff.length
      ? await this.db
          .select({ userId: userPermissionOverrides.userId })
          .from(userPermissionOverrides)
          .where(
            inArray(
              userPermissionOverrides.userId,
              staff.map((e) => e.user.id),
            ),
          )
      : [];
    return staff.map((e) =>
      this.toItem(e.user, e.codes, overrides.filter((o) => o.userId === e.user.id).length),
    );
  }

  async detail(userId: string): Promise<StaffDetail> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const codes = (
      await this.db
        .select({ code: roles.code })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, userId))
    ).map((r) => r.code);
    if (!codes.some((c) => STAFF_CODES.includes(c)))
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const overrides = await this.db
      .select({
        permission: userPermissionOverrides.permissionCode,
        granted: userPermissionOverrides.granted,
      })
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId));
    const [invite] = await this.db
      .select({ expiresAt: staffInvites.expiresAt })
      .from(staffInvites)
      .where(
        and(
          eq(staffInvites.userId, userId),
          isNull(staffInvites.usedAt),
          gt(staffInvites.expiresAt, this.clock.now()),
        ),
      )
      .limit(1);
    return {
      ...this.toItem(user, codes, overrides.length),
      // FK `permissions.code` kafolati; begona qiymat bo'lsa — tashlanadi (as yo'q).
      overrides: overrides.flatMap((o) =>
        isPermission(o.permission) ? [{ permission: o.permission, granted: o.granted }] : [],
      ),
      inviteExpiresAt: invite?.expiresAt.toISOString() ?? null,
    };
  }

  private toItem(user: Row, codes: RoleCode[], overridesCount: number): StaffListItem {
    const status =
      user.status === 'blocked' ? 'blocked' : neededChannel(user, codes) ? 'invited' : 'active';
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      roles: codes,
      status,
      telegramLinked: user.telegramId !== null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      overridesCount,
    };
  }
}
