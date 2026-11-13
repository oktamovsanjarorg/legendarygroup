import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  ApproveGuardianLinkRequest,
  GuardianLinkRequest,
  ListGuardianLinkRequestsQuery,
  RejectGuardianLinkRequest,
} from '@lg/contracts';
import {
  type Database,
  guardianLinkRequests,
  guardians,
  roles,
  studentGuardians,
  students,
  userRoles,
  users,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, count, desc, eq } from 'drizzle-orm';
import type { AuditContext } from '../../common/audit/audit.service.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { normalizePhone } from '../rbac/index.js';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class GuardianLinkRequestsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private formatRequest(r: typeof guardianLinkRequests.$inferSelect): GuardianLinkRequest {
    return {
      ...r,
      telegramId: String(r.telegramId),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async list(
    query: ListGuardianLinkRequestsQuery,
  ): Promise<{ items: GuardianLinkRequest[]; total: number }> {
    const where = query.status ? eq(guardianLinkRequests.status, query.status) : undefined;
    const offset = (query.page - 1) * query.limit;

    const [countRow] = await this.db
      .select({ total: count() })
      .from(guardianLinkRequests)
      .where(where);
    const rows = await this.db
      .select()
      .from(guardianLinkRequests)
      .where(where)
      .orderBy(desc(guardianLinkRequests.createdAt))
      .limit(query.limit)
      .offset(offset);

    return {
      items: rows.map((r) => this.formatRequest(r)),
      total: Number(countRow?.total ?? 0),
    };
  }

  private async resolveStudentLink(
    tx: Tx,
    input: ApproveGuardianLinkRequest,
    req: typeof guardianLinkRequests.$inferSelect,
  ): Promise<string> {
    const [student] = await tx
      .select()
      .from(students)
      .where(eq(students.id, input.studentId ?? ''));
    if (!student) throw new AppException(HttpStatus.NOT_FOUND, 'STUDENT_NOT_FOUND');

    let [g] = await tx.select().from(guardians).where(eq(guardians.phone, req.phone));
    if (!g) {
      const [newG] = await tx
        .insert(guardians)
        .values({ fullName: req.fullName, phone: req.phone })
        .returning();
      if (!newG) throw new Error('Ota-ona yaratilmadi');
      g = newG;
    }

    await tx
      .insert(studentGuardians)
      .values({
        studentId: student.id,
        guardianId: g.id,
        relation: input.relation ?? 'guardian',
        isPrimary: false,
        notify: true,
      })
      .onConflictDoNothing();

    return g.id;
  }

  async approve(
    ctx: AuditContext,
    requestId: string,
    input: ApproveGuardianLinkRequest,
  ): Promise<GuardianLinkRequest> {
    return this.db.transaction(async (tx) => {
      const [req] = await tx
        .select()
        .from(guardianLinkRequests)
        .where(
          and(eq(guardianLinkRequests.id, requestId), eq(guardianLinkRequests.status, 'pending')),
        )
        .for('update');
      if (!req) throw new AppException(HttpStatus.NOT_FOUND, 'REQUEST_NOT_FOUND');

      let resolvedGuardianId = input.guardianId;
      if (input.studentId) {
        resolvedGuardianId = await this.resolveStudentLink(tx, input, req);
      }

      if (resolvedGuardianId) {
        await this.linkGuardianAccount(tx, resolvedGuardianId, req);
      }

      const now = this.clock.now();
      const [updated] = await tx
        .update(guardianLinkRequests)
        .set({
          status: 'approved',
          resolvedGuardianId: resolvedGuardianId ?? null,
          resolvedBy: ctx.actorId,
          resolvedAt: now,
        })
        .where(eq(guardianLinkRequests.id, requestId))
        .returning();
      if (!updated) throw new Error('Soʻrov yangilanmadi');

      await this.audit.record(
        ctx,
        {
          action: 'guardian_link_request.approved',
          entity: 'guardian_link_request',
          entityId: requestId,
          after: { status: 'approved', resolvedGuardianId },
        },
        tx,
      );

      return this.formatRequest(updated);
    });
  }

  async reject(
    ctx: AuditContext,
    requestId: string,
    input: RejectGuardianLinkRequest,
  ): Promise<GuardianLinkRequest> {
    const now = this.clock.now();
    const [updated] = await this.db
      .update(guardianLinkRequests)
      .set({
        status: 'rejected',
        rejectReason: input.reason,
        resolvedBy: ctx.actorId,
        resolvedAt: now,
      })
      .where(
        and(eq(guardianLinkRequests.id, requestId), eq(guardianLinkRequests.status, 'pending')),
      )
      .returning();

    if (!updated) throw new AppException(HttpStatus.NOT_FOUND, 'REQUEST_NOT_FOUND');

    await this.audit.record(ctx, {
      action: 'guardian_link_request.rejected',
      entity: 'guardian_link_request',
      entityId: requestId,
      after: { status: 'rejected', reason: input.reason },
    });

    return this.formatRequest(updated);
  }

  private async linkGuardianAccount(
    tx: Tx,
    guardianId: string,
    req: typeof guardianLinkRequests.$inferSelect,
  ): Promise<void> {
    const [guardian] = await tx.select().from(guardians).where(eq(guardians.id, guardianId));
    if (!guardian) return;

    const phone = normalizePhone(guardian.phone);
    let userId = guardian.userId;

    if (userId) {
      await tx
        .update(users)
        .set({ telegramId: req.telegramId, telegramUsername: req.telegramUsername ?? null })
        .where(eq(users.id, userId));
    } else {
      let [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .for('update');
      if (!existingUser) {
        const [newUser] = await tx
          .insert(users)
          .values({
            fullName: guardian.fullName,
            phone,
            telegramId: req.telegramId,
            telegramUsername: req.telegramUsername ?? null,
            status: 'active',
          })
          .returning();
        if (!newUser) throw new Error('Foydalanuvchi yaratilmadi');
        existingUser = newUser;
      } else {
        await tx
          .update(users)
          .set({ telegramId: req.telegramId, telegramUsername: req.telegramUsername ?? null })
          .where(eq(users.id, existingUser.id));
      }
      userId = existingUser.id;

      const [guardianRole] = await tx.select().from(roles).where(eq(roles.code, 'guardian'));
      if (guardianRole) {
        await tx
          .insert(userRoles)
          .values({ userId, roleId: guardianRole.id })
          .onConflictDoNothing();
      }

      await tx.update(guardians).set({ userId }).where(eq(guardians.id, guardian.id));
    }
  }
}
