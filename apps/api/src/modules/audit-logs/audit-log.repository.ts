import {
  approvalRequests,
  auditLogs,
  type Database,
  payments,
  roles,
  userRoles,
  users,
} from '@lg/db';
import { tashkentDayRange, tashkentMonthRange } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface AuditLogFilter {
  actorId?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export interface RawAuditLogRow {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  at: Date;
  actorName: string | null;
}

export interface RawStaffStats {
  staffId: string;
  staffName: string;
  role: string;
  paymentsCount: number;
  approvalsCount: number;
  avgResponseMinutes: number | null;
}

@Injectable()
export class AuditLogRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findAuditLogs(filter: AuditLogFilter): Promise<RawAuditLogRow[]> {
    const conditions = [];
    if (filter.actorId) conditions.push(eq(auditLogs.actorId, filter.actorId));
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
    if (filter.entity) conditions.push(eq(auditLogs.entity, filter.entity));
    if (filter.from) conditions.push(gte(auditLogs.at, tashkentDayRange(filter.from).start));
    if (filter.to) conditions.push(lt(auditLogs.at, tashkentDayRange(filter.to).end));

    const rows = await this.db
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        before: auditLogs.before,
        after: auditLogs.after,
        ip: auditLogs.ip,
        userAgent: auditLogs.userAgent,
        requestId: auditLogs.requestId,
        at: auditLogs.at,
        actorName: users.fullName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.at))
      .limit(filter.limit)
      .offset(filter.offset);

    return rows;
  }

  async findSuspiciousLogs(limit = 50): Promise<RawAuditLogRow[]> {
    const suspiciousActions = [
      'payment.reverse',
      'payment.refund',
      'discount.grant',
      'attendance.edit_past',
      'penalty.waive',
    ];

    // Shubhali amallar yoki Toshkent vaqti bilan tunda (23:00 - 06:00) qilingan amallar
    // Toshkent vaqti = at AT TIME ZONE 'Asia/Tashkent'
    const rows = await this.db
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        before: auditLogs.before,
        after: auditLogs.after,
        ip: auditLogs.ip,
        userAgent: auditLogs.userAgent,
        requestId: auditLogs.requestId,
        at: auditLogs.at,
        actorName: users.fullName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(
        sql`${auditLogs.action} IN (${sql.join(
          suspiciousActions.map((a) => sql`${a}`),
          sql`, `,
        )}) OR EXTRACT(HOUR FROM ${auditLogs.at} AT TIME ZONE 'Asia/Tashkent') >= 23 OR EXTRACT(HOUR FROM ${auditLogs.at} AT TIME ZONE 'Asia/Tashkent') < 6`,
      )
      .orderBy(desc(auditLogs.at))
      .limit(limit);

    return rows;
  }

  async getStaffActivity(period?: string): Promise<RawStaffStats[]> {
    // Xodimlar ro'yxati (admin yoki director roliga ega bo'lganlar)
    const staffUsers = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        roleCode: roles.code,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(roles.code, ['admin', 'director']));

    const results: RawStaffStats[] = [];

    for (const staff of staffUsers) {
      const payCount = await this.countStaffPayments(staff.id, period);
      const { count: appCount, avgMinutes } = await this.getStaffApprovals(staff.id, period);

      results.push({
        staffId: staff.id,
        staffName: staff.fullName,
        role: staff.roleCode,
        paymentsCount: payCount,
        approvalsCount: appCount,
        avgResponseMinutes: avgMinutes,
      });
    }

    return results;
  }

  private async countStaffPayments(staffId: string, period?: string): Promise<number> {
    const conditions = [eq(payments.receivedBy, staffId)];
    if (period) {
      const { start, end } = this.getPeriodRange(period);
      conditions.push(gte(payments.paidAt, start), lt(payments.paidAt, end));
    }

    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(and(...conditions));

    return Number(row?.count ?? 0);
  }

  private async getStaffApprovals(
    staffId: string,
    period?: string,
  ): Promise<{ count: number; avgMinutes: number | null }> {
    const conditions = [
      eq(approvalRequests.decidedBy, staffId),
      isNotNull(approvalRequests.decidedAt),
    ];
    if (period) {
      const { start, end } = this.getPeriodRange(period);
      conditions.push(gte(approvalRequests.createdAt, start), lt(approvalRequests.createdAt, end));
    }

    const [row] = await this.db
      .select({
        count: sql<number>`count(*)`,
        avgSec: sql<
          number | null
        >`avg(EXTRACT(EPOCH FROM (${approvalRequests.decidedAt} - ${approvalRequests.createdAt})))`,
      })
      .from(approvalRequests)
      .where(and(...conditions));

    const count = Number(row?.count ?? 0);
    const avgMinutes = row?.avgSec ? Number(row.avgSec) / 60 : null;
    return { count, avgMinutes };
  }

  private getPeriodRange(period: string): { start: Date; end: Date } {
    return tashkentMonthRange(period);
  }
}
