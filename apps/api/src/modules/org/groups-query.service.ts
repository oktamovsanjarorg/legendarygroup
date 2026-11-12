import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { GroupDetail, GroupListFilter, GroupListItem } from '@lg/contracts';
import {
  courses,
  type Database,
  groups,
  groupTeachers,
  rooms,
  scheduleSlots,
  type Transaction,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, asc, eq, inArray, ne, type SQL } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { StaffDirectoryService } from '../rbac/index.js';
import { GroupScopeService } from './group-scope.service.js';
import { type GroupBundle, toDetail, toListItem } from './groups.serializer.js';

export interface GroupListParams {
  status: GroupListFilter;
  courseId?: string | undefined;
  roomId?: string | undefined;
  teacherId?: string | undefined;
}

function statusFilter(status: GroupListFilter): SQL | undefined {
  if (status === 'all') return undefined;
  if (status === 'current') return ne(groups.status, 'finished');
  return eq(groups.status, status);
}

/** Guruhlarni o'qish (T-103, W-10): ro'yxat (scope bilan), tafsilot. */
@Injectable()
export class GroupsQueryService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(GroupScopeService) private readonly scope: GroupScopeService,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
  ) {}

  async list(user: RequestUser, p: GroupListParams): Promise<GroupListItem[]> {
    const scope = this.scope.scopeFor(user);
    const where = and(
      scope.kind === 'all' ? undefined : scope.where,
      statusFilter(p.status),
      p.courseId ? eq(groups.courseId, p.courseId) : undefined,
      p.roomId ? eq(groups.roomId, p.roomId) : undefined,
      p.teacherId ? inArray(groups.id, this.scope.activeAssignments(p.teacherId)) : undefined,
    );
    const bundles = await this.bundles(this.db, where);
    const today = this.clock.today();
    return bundles.map((b) => toListItem(b, today));
  }

  async detail(user: RequestUser, id: string): Promise<GroupDetail> {
    await this.scope.assertVisible(user, id);
    return this.detailIn(this.db, id);
  }

  /** Yozish amallaridan keyin javob (tranzaksiya ichida, scope'siz — chaqiruvchi xodim). */
  async detailIn(tx: Database | Transaction, id: string): Promise<GroupDetail> {
    const [bundle] = await this.bundles(tx, eq(groups.id, id));
    if (!bundle) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return toDetail(bundle, this.clock.today());
  }

  /**
   * Boshqa modullar uchun (enrollment, T-106): guruh qatorini `FOR UPDATE` bilan qulflaydi —
   * sig'im tekshiruvi parallel yozilishlarda ketma-ket bajariladi.
   */
  async lockForEnrollment(tx: Transaction, id: string) {
    const [g] = await tx
      .select({
        id: groups.id,
        name: groups.name,
        status: groups.status,
        startDate: groups.startDate,
        endDate: groups.endDate,
        maxStudents: groups.maxStudents,
      })
      .from(groups)
      .where(eq(groups.id, id))
      .for('update');
    return g ?? null;
  }

  async namesOf(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(inArray(groups.id, [...new Set(ids)]));
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  private async bundles(tx: Database | Transaction, where: SQL | undefined) {
    const rows = await tx
      .select({ group: groups, course: { id: courses.id, name: courses.name }, room: rooms })
      .from(groups)
      .innerJoin(courses, eq(courses.id, groups.courseId))
      .leftJoin(rooms, eq(rooms.id, groups.roomId))
      .where(where)
      .orderBy(asc(groups.name), asc(groups.id));
    const ids = rows.map((r) => r.group.id);
    if (ids.length === 0) return [];
    const [teachers, slots] = await Promise.all([
      tx
        .select()
        .from(groupTeachers)
        .where(inArray(groupTeachers.groupId, ids))
        .orderBy(asc(groupTeachers.fromDate)),
      tx
        .select()
        .from(scheduleSlots)
        .where(inArray(scheduleSlots.groupId, ids))
        .orderBy(asc(scheduleSlots.weekday), asc(scheduleSlots.startTime)),
    ]);
    const names = await this.staff.namesOf(teachers.map((t) => t.teacherId));
    return rows.map((r): GroupBundle => ({
      group: r.group,
      course: r.course,
      room: r.room ? { id: r.room.id, name: r.room.name } : null,
      teachers: teachers.filter((t) => t.groupId === r.group.id),
      slots: slots.filter((s) => s.groupId === r.group.id),
      names,
    }));
  }
}
