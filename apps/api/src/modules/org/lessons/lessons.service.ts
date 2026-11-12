import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { LessonDto } from '@lg/contracts';
import {
  type Database,
  type GroupRow,
  groupTeachers,
  type LessonRow,
  lessons,
  type Transaction,
} from '@lg/db';
import { type Clock, hhmm, teacherOn } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { StaffDirectoryService } from '../../rbac/index.js';
import { assertRoomFits } from '../group-validation.js';
import { GroupsService } from '../groups.service.js';
import { assertScheduled, lockLesson, withLessonConstraints } from './lesson-guards.js';
import { LessonsQueryService } from './lessons-query.service.js';

export const lessonAudit = (l: LessonRow) => ({
  groupId: l.groupId,
  date: l.date,
  startTime: hhmm(l.startTime),
  endTime: hhmm(l.endTime),
  roomId: l.roomId,
  teacherId: l.teacherId,
  isSubstitute: l.isSubstitute,
  status: l.status,
  kind: l.kind,
  cancelReason: l.cancelReason,
  compensation: l.compensation,
});

export interface LessonChange {
  ctx: AuditContext;
  action: string;
  id: string;
  change: (tx: Transaction, l: LessonRow, g: GroupRow) => Promise<Record<string, unknown>>;
}

/**
 * Dars amallari (T-104, FR-ORG-5/6): bekor qilish (BR-5), qayta tiklash, o'rinbosar / xona.
 * Har amal — guruh qatori qulflanadi (sinxronlash bilan poyga yo'q), audit.
 */
@Injectable()
export class LessonsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(LessonsQueryService) private readonly query: LessonsQueryService,
  ) {}

  /** Markaz bekor qildi (BR-5): o'quvchidan undirilmaydi — kredit yoki qoplovchi dars (Q-16). */
  cancel(
    ctx: AuditContext,
    id: string,
    input: { reason: string; compensation: 'credit' | null },
  ): Promise<LessonDto> {
    return this.write({
      ctx,
      action: 'lesson.cancel',
      id,
      change: async (tx, l) => {
        assertScheduled(l);
        await this.markCancelled(tx, l.id, {
          reason: input.reason,
          compensation: input.compensation,
        });
        return {};
      },
    });
  }

  /** Qo'lda bekor qilingan, qoplanmagan, hali o'tmagan dars — qaytariladi. */
  restore(ctx: AuditContext, id: string): Promise<LessonDto> {
    return this.write({
      ctx,
      action: 'lesson.restore',
      id,
      change: async (tx, l) => {
        if (l.status !== 'cancelled' || l.cancelSource !== 'manual' || l.compensation === 'makeup')
          throw new AppException(HttpStatus.CONFLICT, 'LESSON_NOT_RESTORABLE');
        if (l.date < this.clock.today())
          throw new AppException(HttpStatus.BAD_REQUEST, 'LESSON_IN_PAST');
        await tx
          .update(lessons)
          .set({
            status: 'scheduled',
            cancelReason: null,
            cancelSource: null,
            cancelledAt: null,
            compensation: null,
          })
          .where(eq(lessons.id, l.id));
        return {};
      },
    });
  }

  /** O'rinbosar ustoz (vaqtincha, FR-ORG-6) va/yoki boshqa xona; `null` — guruhdagi standart. */
  update(
    ctx: AuditContext,
    id: string,
    patch: { teacherId?: string | null; roomId?: string | null },
  ): Promise<LessonDto> {
    return this.write({
      ctx,
      action: 'lesson.update',
      id,
      change: async (tx, l, g) => {
        if (l.status === 'cancelled')
          throw new AppException(HttpStatus.CONFLICT, 'LESSON_NOT_SCHEDULED', { status: l.status });
        const set: Partial<LessonRow> = {};
        if (patch.teacherId !== undefined)
          Object.assign(set, await this.teacherFor(tx, l, patch.teacherId));
        if (patch.roomId !== undefined) {
          await assertRoomFits(tx, patch.roomId, g.maxStudents);
          set.roomId = patch.roomId ?? g.roomId;
          set.roomOverridden = patch.roomId !== null && patch.roomId !== g.roomId;
        }
        await tx.update(lessons).set(set).where(eq(lessons.id, l.id));
        return {};
      },
    });
  }

  async markCancelled(
    tx: Transaction,
    id: string,
    c: { reason: string | null; compensation: 'credit' | 'makeup' | null },
  ): Promise<void> {
    await tx
      .update(lessons)
      .set({
        status: 'cancelled',
        cancelReason: c.reason,
        cancelSource: 'manual',
        cancelledAt: this.clock.now(),
        compensation: c.compensation,
      })
      .where(eq(lessons.id, id));
  }

  /** Umumiy: guruh → dars qulfi, o'zgarish, audit (oldin/keyin), javob. */
  async write(c: LessonChange): Promise<LessonDto> {
    return withLessonConstraints(() =>
      this.db.transaction(async (tx) => {
        const [peek] = await tx
          .select({ groupId: lessons.groupId })
          .from(lessons)
          .where(eq(lessons.id, c.id));
        if (!peek) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
        const g = await this.groups.lockOpen(tx, peek.groupId);
        const before = await lockLesson(tx, c.id);
        const extra = await c.change(tx, before, g);
        const after = await lockLesson(tx, c.id);
        await this.audit.record(
          c.ctx,
          {
            action: c.action,
            entity: 'lesson',
            entityId: c.id,
            before: lessonAudit(before),
            after: { ...lessonAudit(after), ...extra },
          },
          tx,
        );
        return this.query.dtoIn(tx, c.id);
      }),
    );
  }

  /** Asosiy ustozdan farqli bo'lsa — o'rinbosar; `null` — sanadagi asosiy ustozga qaytarish. */
  private async teacherFor(tx: Transaction, l: LessonRow, teacherId: string | null) {
    const main = await tx
      .select()
      .from(groupTeachers)
      .where(and(eq(groupTeachers.groupId, l.groupId), eq(groupTeachers.role, 'main')));
    const planned = teacherOn(
      main.map((m) => ({ teacherId: m.teacherId, from: m.fromDate, to: m.toDate })),
      l.date,
    );
    if (teacherId === null) return { teacherId: planned, isSubstitute: false };
    if (!(await this.staff.isActiveTeacher(teacherId, tx)))
      throw new AppException(HttpStatus.BAD_REQUEST, 'NOT_A_TEACHER');
    return { teacherId, isSubstitute: teacherId !== planned };
  }
}
