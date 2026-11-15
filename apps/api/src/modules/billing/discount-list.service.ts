import { Inject, Injectable } from '@nestjs/common';
import type { DiscountListResponse } from '@lg/contracts';
import { auditLogs, type Database, enrollments, groups, students, users } from '@lg/db';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { SettingsService } from '../settings/index.js';
import { StudentScopeService } from '../students/index.js';

/**
 * W-18 (T-203, BR-18): amaldagi (tugamagan yozilish, foiz > 0) chegirmalar. Sabab va bergan
 * xodim — oxirgi `billing.discount.set` audit yozuvidan (enrollments'da sabab ustuni yo'q).
 * Kutilayotgan so'rovlar — `/approvals?type=discount` (approvals moduli).
 */
@Injectable()
export class DiscountListService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
  ) {}

  async list(user: RequestUser): Promise<DiscountListResponse> {
    this.studentScope.assertUnrestricted(user);
    const last = this.db
      .select({
        entityId: auditLogs.entityId,
        reason: sql<string | null>`${auditLogs.after}->>'reason'`.as('reason'),
        by: users.fullName,
        rn: sql<number>`row_number() over (partition by ${auditLogs.entityId} order by ${auditLogs.at} desc)`.as(
          'rn',
        ),
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(eq(auditLogs.action, 'billing.discount.set'))
      .as('last');
    const rows = await this.db
      .select({
        enrollmentId: enrollments.id,
        studentId: students.id,
        student: students.fullName,
        group: groups.name,
        percent: enrollments.discountPercent,
        reason: last.reason,
        by: last.by,
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .leftJoin(last, and(eq(last.entityId, sql`${enrollments.id}::text`), eq(last.rn, 1)))
      .where(and(isNull(enrollments.endDate), gt(enrollments.discountPercent, 0)))
      .orderBy(desc(enrollments.discountPercent), students.fullName);
    const s = await this.settings.getSettings();
    return {
      adminLimitPercent: s.adminDiscountLimitPercent,
      items: rows.map((r) => ({ ...r, percent: r.percent ?? 0 })),
    };
  }
}
