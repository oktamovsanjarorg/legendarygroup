import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { LeadDto, LeadListQuery, LeadStatsDto } from '@lg/contracts';
import { type Database, leadEvents, type LeadRow, leads, type Transaction } from '@lg/db';
import { conversionPercent, type FunnelCounts } from '@lg/domain';
import { normalizeUz } from '@lg/i18n';
import { and, desc, eq, gte, ilike, lt, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { CoursesService, LessonsQueryService } from '../../org/index.js';
import { StaffDirectoryService } from '../../rbac/index.js';

const LIST_LIMIT = 500;

/** Statistika qatori: davrda yaratilgan lid qaysi holatlardan o'tgan (tarix bo'yicha). */
const reached = (status: string) =>
  // Ichki so'rovda drizzle `leads.id`ni jadval nomisiz chiqaradi ("id" → lead_events.id) —
  // shuning uchun to'liq nom aniq yoziladi.
  sql<number>`count(*) filter (where exists (
    select 1 from ${leadEvents} e where e.lead_id = "leads"."id" and e.status = ${status}
  ))::int`;

/** Lidlarni o'qish (T-107, W-08): kanban ro'yxati, kartochka, manba statistikasi. */
@Injectable()
export class LeadsQueryService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CoursesService) private readonly courses: CoursesService,
    @Inject(LessonsQueryService) private readonly lessons: LessonsQueryService,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
  ) {}

  /** Kanban: filtrlar bilan, oxirgi o'zgargani birinchi (≤ 500; yopilganlarni `status` bilan). */
  async list(q: LeadListQuery): Promise<LeadDto[]> {
    const term = q.q?.trim();
    const rows = await this.db
      .select()
      .from(leads)
      .where(
        and(
          q.status ? eq(leads.status, q.status) : undefined,
          q.courseId ? eq(leads.courseId, q.courseId) : undefined,
          q.source ? eq(leads.source, q.source) : undefined,
          q.assignedTo ? eq(leads.assignedTo, q.assignedTo) : undefined,
          term
            ? or(
                ilike(leads.searchName, `%${escapeLike(normalizeUz(term))}%`),
                ilike(leads.phone, `%${escapeLike(term.replace(/\D/g, '') || term)}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(leads.statusChangedAt), desc(leads.id))
      .limit(LIST_LIMIT);
    return this.toDtos(rows);
  }

  async detail(id: string, tx: Database | Transaction = this.db): Promise<LeadDto> {
    const [row] = await tx.select().from(leads).where(eq(leads.id, id));
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const [dto] = await this.toDtos([row]);
    if (!dto) throw new Error('lid DTO yigʻilmadi');
    return dto;
  }

  /** Manba statistikasi: `[from, to]` (Toshkent kunlari) ichida yaratilgan lidlar voronkasi. */
  async stats(range: { from: string; to: string }): Promise<LeadStatsDto> {
    const rows = await this.db
      .select({
        source: leads.source,
        total: sql<number>`count(*)::int`,
        contacted: reached('contacted'),
        trial: reached('trial'),
        won: sql<number>`count(*) filter (where ${leads.status} = 'won')::int`,
        lost: sql<number>`count(*) filter (where ${leads.status} = 'lost')::int`,
      })
      .from(leads)
      .where(
        and(
          gte(leads.createdAt, sql`(${range.from}::date)::timestamp AT TIME ZONE 'Asia/Tashkent'`),
          lt(
            leads.createdAt,
            sql`((${range.to}::date + 1)::timestamp) AT TIME ZONE 'Asia/Tashkent'`,
          ),
        ),
      )
      .groupBy(leads.source)
      .orderBy(desc(sql`count(*)`));
    const funnel = (c: FunnelCounts) => ({ ...c, conversionPercent: conversionPercent(c) });
    const total = rows.reduce<FunnelCounts>(
      (a, r) => ({
        total: a.total + r.total,
        contacted: a.contacted + r.contacted,
        trial: a.trial + r.trial,
        won: a.won + r.won,
        lost: a.lost + r.lost,
      }),
      { total: 0, contacted: 0, trial: 0, won: 0, lost: 0 },
    );
    return {
      ...range,
      total: funnel(total),
      bySource: rows.map(({ source, ...c }) => ({ source, ...funnel(c) })),
    };
  }

  private async toDtos(rows: readonly LeadRow[]): Promise<LeadDto[]> {
    const ids = (pick: (r: LeadRow) => string | null) =>
      rows.flatMap((r) => {
        const v = pick(r);
        return v === null ? [] : [v];
      });
    const [courseNames, staffNames, trials] = await Promise.all([
      this.courses.namesOf(ids((r) => r.courseId)),
      this.staff.namesOf(ids((r) => r.assignedTo)),
      this.lessons.briefs(ids((r) => r.trialLessonId)),
    ]);
    const ref = (id: string | null, names: Map<string, string>) =>
      id ? { id, name: names.get(id) ?? '—' } : null;
    return rows.map((r) => {
      const trial = r.trialLessonId ? trials.get(r.trialLessonId) : undefined;
      return {
        id: r.id,
        fullName: r.fullName,
        phone: r.phone,
        course: ref(r.courseId, courseNames),
        source: r.source,
        status: r.status,
        assignedTo: ref(r.assignedTo, staffNames),
        notes: r.notes,
        lostReason: r.lostReason,
        trial: trial
          ? {
              lessonId: trial.lessonId,
              date: trial.date,
              startTime: trial.startTime,
              group: trial.group,
            }
          : null,
        studentId: r.studentId,
        statusChangedAt: r.statusChangedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      };
    });
  }
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
