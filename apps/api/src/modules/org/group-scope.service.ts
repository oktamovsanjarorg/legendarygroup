import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type Database, groups, groupTeachers } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq, gte, inArray, isNull, lte, or, type SQL, sql } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';

export type GroupScope = { kind: 'all' } | { kind: 'some'; where: SQL };

/**
 * Guruh scope'i (02 §3, T-103):
 * - Director/Admin — hammasi;
 * - Ustoz — `group_teachers`da **bugun** (Asia/Tashkent) amaldagi biriktirishlari (asosiy yoki
 *   yordamchi). Guruhdan ketgan ustoz eski guruhni ko'rmaydi (Q-64). O'rinbosar (bitta dars) — T-104;
 * - boshqalar — hech narsa (deny by default).
 */
@Injectable()
export class GroupScopeService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  scopeFor(user: RequestUser): GroupScope {
    if (user.role === 'director' || user.role === 'admin') return { kind: 'all' };
    if (user.role !== 'teacher') return { kind: 'some', where: sql`false` };
    return { kind: 'some', where: inArray(groups.id, this.activeAssignments(user.id)) };
  }

  /** Ustozning bugungi faol guruhlari (boshqa modullar — davomat, baholar — uchun ham). */
  activeAssignments(teacherId: string) {
    const today = this.clock.today();
    return this.db
      .select({ id: groupTeachers.groupId })
      .from(groupTeachers)
      .where(
        and(
          eq(groupTeachers.teacherId, teacherId),
          lte(groupTeachers.fromDate, today),
          or(isNull(groupTeachers.toDate), gte(groupTeachers.toDate, today)),
        ),
      );
  }

  /** Scope'dan tashqari — 404 (mavjudligi oshkor qilinmaydi). */
  async assertVisible(user: RequestUser, groupId: string): Promise<void> {
    const scope = this.scopeFor(user);
    const where =
      scope.kind === 'all' ? eq(groups.id, groupId) : and(eq(groups.id, groupId), scope.where);
    const [row] = await this.db.select({ id: groups.id }).from(groups).where(where);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}
