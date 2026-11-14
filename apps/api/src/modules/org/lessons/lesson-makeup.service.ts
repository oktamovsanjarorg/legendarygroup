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
import { type Clock, teacherOn } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { assertRoomFits } from '../group-validation.js';
import { GroupsService } from '../groups.service.js';
import {
  assertBookable,
  assertFreeBeyondHorizon,
  assertScheduled,
  type LessonSlot,
  withLessonConstraints,
} from './lesson-guards.js';
import { LessonsQueryService } from './lessons-query.service.js';
import { lessonAudit, LessonsService } from './lessons.service.js';

interface When {
  date: string;
  startTime: string;
  endTime: string;
  /** `undefined` — standart (dars/guruh xonasi), `null` — xonasiz. */
  roomId?: string | null;
}

/**
 * Qoplovchi va qo'shimcha darslar (T-104, BR-5, Q-16): ko'chirish = bekor qilish + qoplovchi
 * dars (kredit berilmaydi); bekor qilingan darsga keyin qoplovchi qo'shish; qo'shimcha dars.
 */
@Injectable()
export class LessonMakeupService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(LessonsService) private readonly lessons: LessonsService,
    @Inject(LessonsQueryService) private readonly query: LessonsQueryService,
  ) {}

  move(ctx: AuditContext, id: string, input: When & { reason: string | null }): Promise<LessonDto> {
    return this.lessons.write({
      ctx,
      action: 'lesson.move',
      id,
      change: async (tx, l, g) => {
        assertScheduled(l);
        await this.lessons.markCancelled(tx, l.id, {
          reason: input.reason,
          compensation: 'makeup',
        });
        return { makeupLessonId: await this.addMakeup(tx, { g, l, when: input }) };
      },
    });
  }

  makeup(ctx: AuditContext, id: string, input: When): Promise<LessonDto> {
    return this.lessons.write({
      ctx,
      action: 'lesson.makeup',
      id,
      change: async (tx, l, g) => {
        if (l.status !== 'cancelled' || l.compensation === 'makeup')
          throw new AppException(HttpStatus.CONFLICT, 'LESSON_NOT_COMPENSABLE');
        await tx.update(lessons).set({ compensation: 'makeup' }).where(eq(lessons.id, l.id));
        return { makeupLessonId: await this.addMakeup(tx, { g, l, when: input }) };
      },
    });
  }

  createExtra(
    ctx: AuditContext,
    input: When & { groupId: string; topic: string | null },
  ): Promise<LessonDto> {
    return withLessonConstraints(() =>
      this.db.transaction(async (tx) => {
        const g = await this.groups.lockOpen(tx, input.groupId);
        const slot = await this.place(
          tx,
          g,
          input,
          input.roomId === undefined ? g.roomId : input.roomId,
        );
        const row = await this.insert(tx, g, slot, { kind: 'extra', topic: input.topic });
        await this.audit.record(
          ctx,
          {
            action: 'lesson.create_extra',
            entity: 'lesson',
            entityId: row.id,
            after: lessonAudit(row),
          },
          tx,
        );
        return this.query.dtoIn(tx, row.id);
      }),
    );
  }

  /** Qoplovchi dars: xona — so'ralgan yoki asl darsniki; ustoz — asl darsniki (o'rinbosar ham). */
  private async addMakeup(
    tx: Transaction,
    { g, l, when }: { g: GroupRow; l: LessonRow; when: When },
  ): Promise<string> {
    const slot = await this.place(tx, g, when, when.roomId === undefined ? l.roomId : when.roomId);
    const row = await this.insert(
      tx,
      g,
      { ...slot, teacherId: l.teacherId ?? slot.teacherId },
      { kind: 'makeup', makeupForLessonId: l.id, isSubstitute: l.isSubstitute },
    );
    return row.id;
  }

  /** Sana/xona tekshiruvi va sanadagi asosiy ustoz. */
  private async place(
    tx: Transaction,
    g: GroupRow,
    when: When,
    roomId: string | null,
  ): Promise<LessonSlot> {
    const today = this.clock.today();
    assertBookable(g, when.date, today);
    if (roomId !== g.roomId) await assertRoomFits(tx, roomId, g.maxStudents);
    const main = await tx
      .select()
      .from(groupTeachers)
      .where(and(eq(groupTeachers.groupId, g.id), eq(groupTeachers.role, 'main')));
    const teacherId = teacherOn(
      main.map((m) => ({ teacherId: m.teacherId, from: m.fromDate, to: m.toDate })),
      when.date,
    );
    return { date: when.date, startTime: when.startTime, endTime: when.endTime, roomId, teacherId };
  }

  private async insert(
    tx: Transaction,
    g: GroupRow,
    s: LessonSlot,
    extra: Partial<typeof lessons.$inferInsert>,
  ): Promise<LessonRow> {
    await assertFreeBeyondHorizon(tx, g.id, s, this.clock.today());
    const [row] = await tx
      .insert(lessons)
      .values({ ...s, groupId: g.id, roomOverridden: s.roomId !== g.roomId, ...extra })
      .returning();
    if (!row) throw new Error('dars yaratilmadi');
    return row;
  }
}
