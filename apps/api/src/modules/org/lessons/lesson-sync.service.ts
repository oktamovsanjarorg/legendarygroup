import { Inject, Injectable } from '@nestjs/common';
import {
  type GroupRow,
  groups,
  groupTeachers,
  holidays,
  type LessonRow,
  lessons,
  scheduleSlots,
  type Transaction,
} from '@lg/db';
import {
  type Clock,
  generatesLessons,
  hhmm,
  lessonHorizon,
  lessonKey,
  type PlannedLesson,
  planLessons,
  type TeacherAssignment,
  teacherOn,
} from '@lg/domain';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../../common/clock/clock.tokens.js';

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  /** Faqat cron rejimida: to'qnashuv sababli yaratilmagan darslar. */
  skipped: number;
}

/** Jadvaldan endi kelib chiqmaydigan dars saqlanadimi (qaror/tarix bog'langan). */
function keepsUnplanned(l: LessonRow, holidaySet: ReadonlySet<string>): boolean {
  if (l.status === 'done') return true;
  if (l.status !== 'cancelled') return false;
  return l.compensation === 'makeup' || (l.cancelSource === 'holiday' && holidaySet.has(l.date));
}

/** Sinxronlash oynasi: bugundan (yoki guruh boshlanishidan) gorizontgacha, guruh tugashi bilan. */
function syncWindow(g: GroupRow, today: string): { from: string; to: string } {
  const horizon = lessonHorizon(today);
  return {
    from: g.startDate > today ? g.startDate : today,
    to: g.endDate !== null && g.endDate < horizon ? g.endDate : horizon,
  };
}

const sameTime = (l: LessonRow, p: PlannedLesson) =>
  hhmm(l.startTime) === p.startTime && hhmm(l.endTime) === p.endTime;

/**
 * Guruh darslarini jadval bilan moslashtirish (T-104, FR-ORG-5). Bugundan gorizontgacha:
 * yetishmagani yaratiladi, jadvaldan chiqqani o'chiriladi, saqlanganining xona/ustozi
 * (qo'lda o'zgartirilmagan bo'lsa) yangilanadi. O'tmish va o'tgan (`done`) darslar o'zgarmaydi.
 * Idempotent: qayta ishga tushirish hech narsani o'zgartirmaydi. Chaqiruvchi guruh qatorini qulflaydi.
 */
@Injectable()
export class LessonSyncService {
  constructor(@Inject(CLOCK_TOKEN) private readonly clock: Clock) {}

  async sync(tx: Transaction, groupId: string, mode: 'api' | 'cron' = 'api'): Promise<SyncResult> {
    const [g] = await tx.select().from(groups).where(eq(groups.id, groupId));
    if (!g) throw new Error(`guruh topilmadi: ${groupId}`);
    const today = this.clock.today();
    const { from, to } = syncWindow(g, today);
    const holidaySet = await this.holidaysIn(tx, from, to);
    const planned = await this.plan(tx, g, { from, to }, holidaySet);
    const existing = await tx
      .select()
      .from(lessons)
      .where(
        and(eq(lessons.groupId, groupId), eq(lessons.kind, 'regular'), gte(lessons.date, today)),
      );
    const result: SyncResult = { created: 0, updated: 0, deleted: 0, skipped: 0 };
    const byKey = new Map(planned.map((p) => [lessonKey(p), p]));
    const main = await this.mainTeachers(tx, groupId);
    const occupied = new Set<string>();
    const drop: string[] = [];
    for (const l of existing) {
      const p = byKey.get(lessonKey(l));
      if (p && sameTime(l, p)) {
        occupied.add(lessonKey(l));
        if (await this.refresh(tx, { g, l, p, main })) result.updated++;
      } else if (keepsUnplanned(l, holidaySet)) occupied.add(lessonKey(l));
      else drop.push(l.id);
    }
    if (drop.length > 0) await tx.delete(lessons).where(inArray(lessons.id, drop));
    result.deleted = drop.length;
    const missing = planned.filter((p) => !occupied.has(lessonKey(p)));
    const rows = missing.map((p) => ({
      groupId,
      slotId: p.slotId,
      date: p.date,
      startTime: p.startTime,
      endTime: p.endTime,
      roomId: g.roomId,
      teacherId: teacherOn(main, p.date),
    }));
    result.created = await this.insert(tx, rows, mode);
    result.skipped = rows.length - result.created;
    return result;
  }

  /**
   * Cron: to'qnashgan (qo'lda qo'yilgan dars bilan) dars o'tkazib yuboriladi va hisobotga tushadi;
   * API: xato — o'zgarish bekor qilinadi (LESSON_CONFLICT).
   */
  private async insert(
    tx: Transaction,
    rows: (typeof lessons.$inferInsert)[],
    mode: 'api' | 'cron',
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const q = tx.insert(lessons).values(rows);
    const inserted = await (mode === 'cron' ? q.onConflictDoNothing() : q).returning({
      id: lessons.id,
    });
    return inserted.length;
  }

  private async plan(
    tx: Transaction,
    g: GroupRow,
    range: { from: string; to: string },
    holidaySet: ReadonlySet<string>,
  ): Promise<PlannedLesson[]> {
    if (!generatesLessons(g.status) || range.from > range.to) return [];
    const slots = await tx.select().from(scheduleSlots).where(eq(scheduleSlots.groupId, g.id));
    return planLessons(slots, range, holidaySet);
  }

  /** Saqlangan darsning xona/ustoz/slotini guruhdagi amaldagi qiymatga moslash. */
  private async refresh(
    tx: Transaction,
    { g, l, p, main }: { g: GroupRow; l: LessonRow; p: PlannedLesson; main: TeacherAssignment[] },
  ): Promise<boolean> {
    if (l.status !== 'scheduled') return false;
    const next = {
      slotId: p.slotId,
      roomId: l.roomOverridden ? l.roomId : g.roomId,
      teacherId: l.isSubstitute ? l.teacherId : teacherOn(main, l.date),
    };
    if (next.slotId === l.slotId && next.roomId === l.roomId && next.teacherId === l.teacherId)
      return false;
    await tx.update(lessons).set(next).where(eq(lessons.id, l.id));
    return true;
  }

  private async mainTeachers(tx: Transaction, groupId: string): Promise<TeacherAssignment[]> {
    const rows = await tx
      .select()
      .from(groupTeachers)
      .where(and(eq(groupTeachers.groupId, groupId), eq(groupTeachers.role, 'main')));
    return rows.map((r) => ({ teacherId: r.teacherId, from: r.fromDate, to: r.toDate }));
  }

  private async holidaysIn(tx: Transaction, from: string, to: string): Promise<Set<string>> {
    if (from > to) return new Set();
    const rows = await tx
      .select({ date: holidays.date })
      .from(holidays)
      .where(and(gte(holidays.date, from), lte(holidays.date, to)));
    return new Set(rows.map((r) => r.date));
  }
}
