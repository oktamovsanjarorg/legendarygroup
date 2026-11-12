import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  CreateGroupRequest,
  GroupDetail,
  GroupStatus,
  UpdateGroupRequest,
} from '@lg/contracts';
import {
  type Database,
  groups,
  type GroupRow,
  groupTeachers,
  scheduleSlots,
  type Transaction,
} from '@lg/db';
import { canChangeGroupStatus, type Clock } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { changedFields } from '../../common/audit/audit-diff.js';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { StaffDirectoryService } from '../rbac/index.js';
import {
  activeCourse,
  assertRoomFits,
  assertSlotsDisjoint,
  assertTeachers,
} from './group-validation.js';
import { GroupsQueryService } from './groups-query.service.js';
import { GROUP_AUDIT_FIELDS } from './groups.serializer.js';
import { LessonSyncService } from './lessons/lesson-sync.service.js';
import { rebuildOccupancy, withGroupConstraints } from './schedule-occupancy.js';

type CreateInput = z.output<typeof CreateGroupRequest>;

/** Audit uchun guruhning solishtiriladigan ko'rinishi (pul — string). */
const auditView = (g: GroupRow) => ({ ...g, monthlyPrice: g.monthlyPrice.toString() });

/** Guruh yozish amallari (T-103, FR-ORG-3): yaratish, tahrir, holat. Har amal — audit. */
@Injectable()
export class GroupsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
    @Inject(GroupsQueryService) private readonly query: GroupsQueryService,
    @Inject(LessonSyncService) private readonly lessons: LessonSyncService,
  ) {}

  /** Narx va baho sozlamasi kursdan meros; slotlar va ustozlar boshlanish sanasidan. */
  async create(ctx: AuditContext, input: CreateInput): Promise<GroupDetail> {
    const { slots, teachers, ...fields } = input;
    assertSlotsDisjoint(slots, fields.startDate);
    return withGroupConstraints(this.db, (trace) =>
      this.db.transaction(async (tx) => {
        const course = await activeCourse(tx, fields.courseId);
        await assertRoomFits(tx, fields.roomId, fields.maxStudents);
        await assertTeachers(this.staff, tx, teachers);
        const [g] = await tx
          .insert(groups)
          .values({
            ...fields,
            monthlyPrice: fields.monthlyPrice ?? course.defaultMonthlyPrice,
            gradingConfig: fields.gradingConfig ?? {
              scale: course.gradeScale,
              kinds: ['homework', 'activity'],
            },
          })
          .returning();
        if (!g) throw new Error('guruh yaratilmadi');
        if (teachers.length > 0)
          await tx
            .insert(groupTeachers)
            .values(teachers.map((t) => ({ ...t, groupId: g.id, fromDate: g.startDate })));
        if (slots.length > 0)
          await tx
            .insert(scheduleSlots)
            .values(slots.map((s) => ({ ...s, groupId: g.id, validFrom: g.startDate })));
        await rebuildOccupancy(tx, g.id, trace);
        await this.lessons.sync(tx, g.id);
        const detail = await this.query.detailIn(tx, g.id);
        await this.audit.record(
          ctx,
          {
            action: 'group.create',
            entity: 'group',
            entityId: g.id,
            after: { ...auditView(g), teachers: teachers.length, slots: slots.length },
          },
          tx,
        );
        return detail;
      }),
    );
  }

  async update(ctx: AuditContext, id: string, patch: UpdateGroupRequest): Promise<GroupDetail> {
    return withGroupConstraints(this.db, (trace) =>
      this.db.transaction(async (tx) => {
        const current = await this.lockOpen(tx, id);
        if (patch.startDate && patch.startDate !== current.startDate) {
          if (current.status !== 'forming')
            throw new AppException(HttpStatus.CONFLICT, 'START_DATE_LOCKED');
          await this.shiftStart(tx, current, patch.startDate);
        }
        const endDate = patch.endDate === undefined ? current.endDate : patch.endDate;
        const startDate = patch.startDate ?? current.startDate;
        if (endDate !== null && endDate < startDate)
          throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE');
        if (patch.roomId !== undefined || patch.maxStudents !== undefined)
          await assertRoomFits(
            tx,
            patch.roomId === undefined ? current.roomId : patch.roomId,
            patch.maxStudents ?? current.maxStudents,
          );
        const [row] = await tx.update(groups).set(patch).where(eq(groups.id, id)).returning();
        await rebuildOccupancy(tx, id, trace);
        await this.lessons.sync(tx, id);
        return this.recordChange(tx, { ctx, action: 'group.update', before: current, after: row });
      }),
    );
  }

  /**
   * Holat (FR-ORG-3). Yakunlanganda tugash sanasi bugundan keyin bo'lsa yoki yo'q bo'lsa —
   * bugun; bandlik bo'shatiladi. To'xtatilgan guruh resursni band qilib turadi (Q-69).
   */
  async changeStatus(ctx: AuditContext, id: string, status: GroupStatus): Promise<GroupDetail> {
    return withGroupConstraints(this.db, (trace) =>
      this.db.transaction(async (tx) => {
        const current = await this.lock(tx, id);
        if (!canChangeGroupStatus(current.status, status))
          throw new AppException(HttpStatus.CONFLICT, 'INVALID_STATUS_TRANSITION', {
            from: current.status,
            to: status,
          });
        const today = this.clock.today();
        const endDate =
          status === 'finished' && (current.endDate === null || current.endDate > today)
            ? today < current.startDate
              ? current.startDate
              : today
            : current.endDate;
        const [row] = await tx
          .update(groups)
          .set({ status, endDate })
          .where(eq(groups.id, id))
          .returning();
        await rebuildOccupancy(tx, id, trace);
        await this.lessons.sync(tx, id);
        return this.recordChange(tx, { ctx, action: 'group.status', before: current, after: row });
      }),
    );
  }

  /** Yig'ilayotgan guruh boshlanishi ko'chsa — boshlanishdan amal qilgan slot/ustozlar ham. */
  private async shiftStart(tx: Transaction, g: GroupRow, to: string): Promise<void> {
    await tx
      .update(scheduleSlots)
      .set({ validFrom: to })
      .where(and(eq(scheduleSlots.groupId, g.id), eq(scheduleSlots.validFrom, g.startDate)));
    await tx
      .update(groupTeachers)
      .set({ fromDate: to })
      .where(and(eq(groupTeachers.groupId, g.id), eq(groupTeachers.fromDate, g.startDate)));
  }

  async lock(tx: Transaction, id: string): Promise<GroupRow> {
    const [g] = await tx.select().from(groups).where(eq(groups.id, id)).for('update');
    if (!g) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return g;
  }

  /** Yakunlangan guruh — faqat o'qish uchun. */
  async lockOpen(tx: Transaction, id: string): Promise<GroupRow> {
    const g = await this.lock(tx, id);
    if (g.status === 'finished') throw new AppException(HttpStatus.CONFLICT, 'GROUP_FINISHED');
    return g;
  }

  private async recordChange(
    tx: Transaction,
    c: { ctx: AuditContext; action: string; before: GroupRow; after: GroupRow | undefined },
  ): Promise<GroupDetail> {
    if (!c.after) throw new Error('guruh yangilanmadi');
    const diff = changedFields(auditView(c.before), auditView(c.after), GROUP_AUDIT_FIELDS);
    await this.audit.record(
      c.ctx,
      { action: c.action, entity: 'group', entityId: c.after.id, ...diff },
      tx,
    );
    return this.query.detailIn(tx, c.after.id);
  }
}
