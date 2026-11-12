import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { GroupDetail, GroupTeacherRole, SlotInput } from '@lg/contracts';
import {
  type Database,
  type GroupRow,
  groupTeachers,
  scheduleSlots,
  type Transaction,
} from '@lg/db';
import { addDays, planScheduleChange } from '@lg/domain';
import { and, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { StaffDirectoryService } from '../rbac/index.js';
import { assertSlotsDisjoint } from './group-validation.js';
import { GroupsQueryService } from './groups-query.service.js';
import { GroupsService } from './groups.service.js';
import { rebuildOccupancy, withGroupConstraints } from './schedule-occupancy.js';

/** Sana guruh davri ichidami (boshlanishdan oldin yoki tugagandan keyin — xato). */
function assertWithinGroup(g: GroupRow, day: string): void {
  if (day < g.startDate || (g.endDate !== null && day > g.endDate))
    throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', {
      startDate: g.startDate,
      endDate: g.endDate,
    });
}

/**
 * Jadval va ustoz biriktirish (T-103, FR-ORG-3/6). O'tmish o'zgarmaydi: eski slot/biriktirish
 * sanadan oldingi kunda yopiladi. Kelajakdagi darslarni qayta hisoblash — T-104.
 */
@Injectable()
export class GroupScheduleService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(GroupsQueryService) private readonly query: GroupsQueryService,
  ) {}

  async replaceSchedule(
    ctx: AuditContext,
    id: string,
    input: { from: string; slots: SlotInput[] },
  ): Promise<GroupDetail> {
    assertSlotsDisjoint(input.slots, input.from);
    return this.write(ctx, id, 'group.schedule', async (tx, g) => {
      assertWithinGroup(g, input.from);
      const existing = await tx.select().from(scheduleSlots).where(eq(scheduleSlots.groupId, id));
      const plan = planScheduleChange(existing, input.from);
      if (plan.remove.length > 0)
        await tx.delete(scheduleSlots).where(inArray(scheduleSlots.id, plan.remove));
      for (const c of plan.close)
        await tx
          .update(scheduleSlots)
          .set({ validTo: c.validTo })
          .where(eq(scheduleSlots.id, c.id));
      if (input.slots.length > 0)
        await tx
          .insert(scheduleSlots)
          .values(input.slots.map((s) => ({ ...s, groupId: id, validFrom: input.from })));
      return { from: input.from, slots: input.slots, closed: plan.close.length };
    });
  }

  /**
   * Ustoz biriktirish. Asosiy ustoz — doimiy almashtirish (FR-ORG-6): amaldagi asosiy `from - 1`
   * da yopiladi; `from` dan boshlanadigan (hali kuchga kirmagan) asosiy biriktirish o'rniga yangi.
   */
  async assignTeacher(
    ctx: AuditContext,
    id: string,
    input: { teacherId: string; role: GroupTeacherRole; from: string },
  ): Promise<GroupDetail> {
    return this.write(ctx, id, 'group.teacher_assign', async (tx, g) => {
      assertWithinGroup(g, input.from);
      if (!(await this.staff.isActiveTeacher(input.teacherId, tx)))
        throw new AppException(HttpStatus.BAD_REQUEST, 'NOT_A_TEACHER');
      if (input.role === 'main') await this.vacateMain(tx, id, input.from);
      await tx.insert(groupTeachers).values({
        groupId: id,
        teacherId: input.teacherId,
        role: input.role,
        fromDate: input.from,
      });
      return input;
    });
  }

  async endAssignment(
    ctx: AuditContext,
    ids: { groupId: string; assignmentId: string },
    to: string,
  ): Promise<GroupDetail> {
    return this.write(ctx, ids.groupId, 'group.teacher_end', async (tx) => {
      const [a] = await tx
        .select()
        .from(groupTeachers)
        .where(and(eq(groupTeachers.id, ids.assignmentId), eq(groupTeachers.groupId, ids.groupId)))
        .for('update');
      if (!a) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      if (to < a.fromDate) throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE');
      await tx.update(groupTeachers).set({ toDate: to }).where(eq(groupTeachers.id, a.id));
      return { assignmentId: a.id, teacherId: a.teacherId, before: a.toDate, to };
    });
  }

  private async vacateMain(tx: Transaction, groupId: string, from: string): Promise<void> {
    const isMain = and(eq(groupTeachers.groupId, groupId), eq(groupTeachers.role, 'main'));
    await tx.delete(groupTeachers).where(and(isMain, gte(groupTeachers.fromDate, from)));
    await tx
      .update(groupTeachers)
      .set({ toDate: addDays(from, -1) })
      .where(
        and(
          isMain,
          lt(groupTeachers.fromDate, from),
          or(isNull(groupTeachers.toDate), gte(groupTeachers.toDate, from)),
        ),
      );
  }

  /** Umumiy: lock (yakunlanmagan) → o'zgarish → bandlik → audit → javob. */
  private write(
    ctx: AuditContext,
    id: string,
    action: string,
    change: (tx: Transaction, g: GroupRow) => Promise<Record<string, unknown>>,
  ): Promise<GroupDetail> {
    return withGroupConstraints(this.db, (trace) =>
      this.db.transaction(async (tx) => {
        const g = await this.groups.lockOpen(tx, id);
        const after = await change(tx, g);
        await rebuildOccupancy(tx, id, trace);
        await this.audit.record(ctx, { action, entity: 'group', entityId: id, after }, tx);
        return this.query.detailIn(tx, id);
      }),
    );
  }
}
