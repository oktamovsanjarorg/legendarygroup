import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Permission, RoleCode } from '@lg/contracts';
import {
  type Database,
  roles,
  sessions,
  type Transaction,
  userPermissionOverrides,
  userRoles,
  users,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { canRemoveDirector, type OverrideError, overrideError } from '@lg/domain';
import { and, eq, isNull } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { bumpPermissionsVersion } from './user-version.js';

/**
 * Ruxsat/rol/holat o'zgarishlari (02 §1–§4). Har o'zgarish — `permissions_version + 1`
 * (keyingi so'rovdan kuchga kiradi) va audit, hammasi bitta tranzaksiyada.
 * Xodim yaratish va taklif — `StaffService` (T-101).
 */
@Injectable()
export class RbacService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Override qo'yish (`granted`) yoki olib tashlash (`null`). Qoidalar — `overrideError`. */
  async setOverride(
    ctx: AuditContext,
    target: { userId: string; permission: Permission; granted: boolean | null },
  ): Promise<void> {
    if (target.granted !== null) {
      const error = this.overrideCheck(
        await this.rolesOf(target.userId),
        target.permission,
        target.granted,
      );
      if (error) throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, error);
    }
    await this.db.transaction(async (tx) => {
      const before = await tx
        .select({ granted: userPermissionOverrides.granted })
        .from(userPermissionOverrides)
        .where(
          and(
            eq(userPermissionOverrides.userId, target.userId),
            eq(userPermissionOverrides.permissionCode, target.permission),
          ),
        );
      await tx
        .delete(userPermissionOverrides)
        .where(
          and(
            eq(userPermissionOverrides.userId, target.userId),
            eq(userPermissionOverrides.permissionCode, target.permission),
          ),
        );
      if (target.granted !== null) {
        await tx.insert(userPermissionOverrides).values({
          userId: target.userId,
          permissionCode: target.permission,
          granted: target.granted,
          createdBy: ctx.actorId,
        });
      }
      await bumpPermissionsVersion(tx, target.userId);
      await this.audit.record(
        ctx,
        {
          action: 'rbac.override_set',
          entity: 'user',
          entityId: target.userId,
          before: { permission: target.permission, granted: before[0]?.granted ?? null },
          after: { permission: target.permission, granted: target.granted },
        },
        tx,
      );
    });
  }

  /** Bloklash (02 §1): barcha sessiyalar darhol bekor; oxirgi faol Director — himoyalangan. */
  async blockUser(ctx: AuditContext, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.assertNotLastDirector(tx, userId);
      const [u] = await tx
        .update(users)
        .set({ status: 'blocked' })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      if (!u) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      await tx
        .update(sessions)
        .set({ revokedAt: this.clock.now() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
      await bumpPermissionsVersion(tx, userId);
      await this.audit.record(
        ctx,
        { action: 'user.block', entity: 'user', entityId: userId, after: { status: 'blocked' } },
        tx,
      );
    });
  }

  /** Rolni olish; Director bo'lsa — oxirgi faol Director himoyasi. */
  async removeRole(ctx: AuditContext, userId: string, role: RoleCode): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (role === 'director') await this.assertNotLastDirector(tx, userId);
      const [r] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.code, role));
      const removed = r
        ? await tx
            .delete(userRoles)
            .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, r.id)))
            .returning({ userId: userRoles.userId })
        : [];
      if (removed.length === 0) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      await bumpPermissionsVersion(tx, userId);
      await this.audit.record(
        ctx,
        { action: 'user.role_removed', entity: 'user', entityId: userId, before: { role } },
        tx,
      );
    });
  }

  /**
   * `granted=true`: maqsad Admin bo'lishi va ruxsat delegatsiya qilinadigan bo'lishi shart
   * (delegatsiya qilinmaydigan — har doim rad). `granted=false`: maqsadning biror rolida shu ruxsat bor.
   */
  private overrideCheck(
    targetRoles: RoleCode[],
    permission: Permission,
    granted: boolean,
  ): OverrideError | null {
    if (granted) {
      const asAdmin = overrideError('admin', { permission, granted });
      if (asAdmin === 'NON_DELEGABLE_PERMISSION') return asAdmin;
      return targetRoles.includes('admin') ? asAdmin : 'OVERRIDE_NOT_ALLOWED';
    }
    return targetRoles.some((r) => overrideError(r, { permission, granted }) === null)
      ? null
      : 'OVERRIDE_NOT_ALLOWED';
  }

  private async rolesOf(userId: string): Promise<RoleCode[]> {
    const rows = await this.db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId));
    if (rows.length === 0) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return rows.map((r) => r.code);
  }

  /** Qator qulfi bilan: parallel ikki bloklash oxirgi Director'ni ham olib qo'ymasin. */
  private async assertNotLastDirector(tx: Transaction, userId: string): Promise<void> {
    const directors = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(and(eq(roles.code, 'director'), eq(users.status, 'active')))
      .for('update', { of: users });
    const isDirector = directors.some((d) => d.userId === userId);
    if (isDirector && !canRemoveDirector(directors.filter((d) => d.userId !== userId).length)) {
      throw new AppException(HttpStatus.CONFLICT, 'LAST_DIRECTOR');
    }
  }
}
