import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { LessonCalendarQuery, LessonDto } from '@lg/contracts';
import {
  type Database,
  groups,
  groupTeachers,
  type LessonRow,
  lessons,
  rooms,
  type Transaction,
} from '@lg/db';
import { type Clock, hhmm } from '@lg/domain';
import { and, asc, eq, exists, gte, inArray, isNull, lte, or, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { CLOCK_TOKEN } from '../../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { RequestUser } from '../../auth/index.js';
import { StaffDirectoryService } from '../../rbac/index.js';

const makeup = alias(lessons, 'makeup');

export interface LessonBrief {
  lessonId: string;
  date: string;
  startTime: string;
  status: LessonRow['status'];
  group: { id: string; name: string };
}

/** Dars konteksti — boshqa modullar (davomat, ro'yxat) uchun. */
export interface LessonInfo {
  id: string;
  groupId: string;
  date: string;
  status: LessonRow['status'];
}

/**
 * Darslar o'qish va scope'i (T-104, 02 §3):
 * - Director/Admin — hammasi;
 * - Ustoz — dars sanasida shu guruhga biriktirilgan (asosiy/yordamchi) va biriktirish hali tugamagan
 *   (Q-64), yoki o'rinbosar sifatida qo'yilgan dars — faqat dars kuni tugaguncha;
 * - boshqalar — hech narsa.
 */
@Injectable()
export class LessonsQueryService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
  ) {}

  scopeWhere(user: RequestUser): SQL | undefined {
    if (user.role === 'director' || user.role === 'admin') return undefined;
    if (user.role !== 'teacher') return sql`false`;
    const today = this.clock.today();
    const assigned = this.db
      .select({ one: sql`1` })
      .from(groupTeachers)
      .where(
        and(
          eq(groupTeachers.groupId, lessons.groupId),
          eq(groupTeachers.teacherId, user.id),
          lte(groupTeachers.fromDate, lessons.date),
          or(isNull(groupTeachers.toDate), gte(groupTeachers.toDate, lessons.date)),
          or(isNull(groupTeachers.toDate), gte(groupTeachers.toDate, today)),
        ),
      );
    return or(exists(assigned), and(eq(lessons.teacherId, user.id), gte(lessons.date, today)));
  }

  /** Kalendar (web + Mini App): oraliq ≤ 62 kun, sana/vaqt bo'yicha. */
  async calendar(user: RequestUser, q: LessonCalendarQuery): Promise<LessonDto[]> {
    return this.select(
      this.db,
      and(
        gte(lessons.date, q.from),
        lte(lessons.date, q.to),
        q.groupId ? eq(lessons.groupId, q.groupId) : undefined,
        q.teacherId ? eq(lessons.teacherId, q.teacherId) : undefined,
        q.roomId ? eq(lessons.roomId, q.roomId) : undefined,
        this.scopeWhere(user),
      ),
    );
  }

  async detail(user: RequestUser, id: string): Promise<LessonDto> {
    const [l] = await this.select(this.db, and(eq(lessons.id, id), this.scopeWhere(user)));
    if (!l) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return l;
  }

  /** Scope bilan tekshirish; ko'rinmasa — 404. */
  async assertVisible(user: RequestUser, id: string): Promise<LessonInfo> {
    const [l] = await this.db
      .select({
        id: lessons.id,
        groupId: lessons.groupId,
        date: lessons.date,
        status: lessons.status,
      })
      .from(lessons)
      .where(and(eq(lessons.id, id), this.scopeWhere(user)));
    if (!l) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return l;
  }

  /** Boshqa modullar uchun (lidning sinov darsi): id → qisqa ma'lumot. */
  async briefs(ids: readonly string[]): Promise<Map<string, LessonBrief>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: lessons.id,
        date: lessons.date,
        startTime: lessons.startTime,
        status: lessons.status,
        groupId: groups.id,
        groupName: groups.name,
      })
      .from(lessons)
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .where(inArray(lessons.id, [...new Set(ids)]));
    return new Map(
      rows.map((r) => [
        r.id,
        {
          lessonId: r.id,
          date: r.date,
          startTime: hhmm(r.startTime),
          status: r.status,
          group: { id: r.groupId, name: r.groupName },
        },
      ]),
    );
  }

  async dtoIn(tx: Transaction, id: string): Promise<LessonDto> {
    const [l] = await this.select(tx, eq(lessons.id, id));
    if (!l) throw new Error(`dars topilmadi: ${id}`);
    return l;
  }

  private async select(tx: Database | Transaction, where: SQL | undefined): Promise<LessonDto[]> {
    const rows = await tx
      .select({
        l: lessons,
        groupName: groups.name,
        room: { id: rooms.id, name: rooms.name },
        makeupId: makeup.id,
      })
      .from(lessons)
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .leftJoin(rooms, eq(rooms.id, lessons.roomId))
      .leftJoin(makeup, eq(makeup.makeupForLessonId, lessons.id))
      .where(where)
      .orderBy(asc(lessons.date), asc(lessons.startTime), asc(groups.name))
      .limit(5000);
    const names = await this.staff.namesOf(
      rows.flatMap((r) => (r.l.teacherId ? [r.l.teacherId] : [])),
    );
    return rows.map(({ l, groupName, room, makeupId }) => ({
      id: l.id,
      group: { id: l.groupId, name: groupName },
      date: l.date,
      startTime: hhmm(l.startTime),
      endTime: hhmm(l.endTime),
      room: room?.id ? { id: room.id, name: room.name } : null,
      teacher: l.teacherId ? { id: l.teacherId, name: names.get(l.teacherId) ?? '—' } : null,
      isSubstitute: l.isSubstitute,
      roomOverridden: l.roomOverridden,
      status: l.status,
      kind: l.kind,
      cancelReason: l.cancelReason,
      cancelSource: l.cancelSource,
      compensation: l.compensation,
      makeupLessonId: makeupId,
      makeupForLessonId: l.makeupForLessonId,
      topic: l.topic,
    }));
  }
}
