import {
  approvalRequests,
  auditLogs,
  type Database,
  payments,
  roles,
  userRoles,
  users,
} from '@lg/db';
import { SUSPICIOUS_ACTIONS, tashkentDayRange, tashkentMonthRange } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, gte, inArray, isNotNull, like, lt, or, sql } from 'drizzle-orm';
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

const STAFF = ['director', 'admin', 'teacher'] as const;

@Injectable()
export class AuditLogRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findAuditLogs(filter: AuditLogFilter): Promise<RawAuditLogRow[]> {
    const conditions = [];
    if (filter.actorId) conditions.push(eq(auditLogs.actorId, filter.actorId));
    if (filter.action) conditions.push(like(auditLogs.action, `${filter.action}%`));
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
    const hour = sql`extract(hour from ${auditLogs.at} at time zone 'Asia/Tashkent')`;
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
        or(
          inArray(auditLogs.action, [...SUSPICIOUS_ACTIONS]),
          // Tunda — faqat xodim (tizim cron'i va ota-ona harakati shubhali emas).
          and(inArray(auditLogs.actorRole, [...STAFF]), or(gte(hour, 23), lt(hour, 6))),
        ),
      )
      .orderBy(desc(auditLogs.at))
      .limit(limit);

    return rows;
  }

  async getStaffActivity(period?: string): Promise<RawStaffStats[]> {
    // Bitta xodim — bitta qator (ikki rolli bo'lsa ham).
    const staffUsers = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        roleCode: sql<string>`case when bool_or(${roles.code} = 'director') then 'director' else 'admin' end`,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(roles.code, ['admin', 'director']))
      .groupBy(users.id, users.fullName)
      .orderBy(users.fullName);

    return Promise.all(
      staffUsers.map(async (staff) => {
        const [paymentsCount, approvals] = await Promise.all([
          this.countStaffPayments(staff.id, period),
          this.getStaffApprovals(staff.id, period),
        ]);
        return {
          staffId: staff.id,
          staffName: staff.fullName,
          role: staff.roleCode,
          paymentsCount,
          approvalsCount: approvals.count,
          avgResponseMinutes: approvals.avgMinutes,
        };
      }),
    );
  }

  private async countStaffPayments(staffId: string, period?: string): Promise<number> {
    // Storno/refund — manfiy to'lov: «nechta to'lov kiritdi»ga kirmaydi.
    const conditions = [eq(payments.receivedBy, staffId), gt(payments.amount, 0n)];
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
      conditions.push(gte(approvalRequests.decidedAt, start), lt(approvalRequests.decidedAt, end));
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
