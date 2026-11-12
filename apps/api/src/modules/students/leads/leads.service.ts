import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CreateLeadRequest, LeadDto, LeadStatus, UpdateLeadRequest } from '@lg/contracts';
import {
  type Database,
  isUniqueViolation,
  leadEvents,
  type LeadRow,
  leads,
  type Transaction,
} from '@lg/db';
import { canChangeLeadStatus, type Clock } from '@lg/domain';
import { normalizeUz } from '@lg/i18n';
import { and, eq, inArray } from 'drizzle-orm';
import { maskPii } from '../../../common/audit/audit-diff.js';
import { type AuditContext, AuditService } from '../../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { CoursesService, LessonsQueryService } from '../../org/index.js';
import { StaffDirectoryService } from '../../rbac/index.js';
import { LeadsQueryService } from './leads-query.service.js';

/** Audit uchun lid ko'rinishi (telefon maskalanadi). */
export const leadAudit = (l: LeadRow) =>
  maskPii({
    fullName: l.fullName,
    phone: l.phone,
    courseId: l.courseId,
    source: l.source,
    status: l.status,
    assignedTo: l.assignedTo,
    trialLessonId: l.trialLessonId,
    lostReason: l.lostReason,
    studentId: l.studentId,
  });

export interface LeadWrite {
  ctx: AuditContext;
  action: string;
  id: string;
  change: (tx: Transaction, l: LeadRow) => Promise<Partial<LeadRow>>;
}

/** Lid yozish amallari (T-107, FR-STU-4). Har amal — audit; holat o'zgarishi — `lead_events`. */
@Injectable()
export class LeadsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CoursesService) private readonly courses: CoursesService,
    @Inject(LessonsQueryService) private readonly lessons: LessonsQueryService,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
    @Inject(LeadsQueryService) private readonly query: LeadsQueryService,
  ) {}

  /** Telefon bo'yicha ochiq lid bo'lsa — 409 `LEAD_EXISTS` (`details.leadId`). */
  async create(ctx: AuditContext, input: CreateLeadRequest): Promise<LeadDto> {
    await this.assertRefs(input);
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(leads)
          .values({ ...input, searchName: normalizeUz(input.fullName) })
          .returning();
        if (!row) throw new Error('lid yaratilmadi');
        await tx.insert(leadEvents).values({ leadId: row.id, status: 'new', actorId: ctx.actorId });
        await this.audit.record(
          ctx,
          { action: 'lead.create', entity: 'lead', entityId: row.id, after: leadAudit(row) },
          tx,
        );
        return this.query.detail(row.id, tx);
      });
    } catch (err) {
      if (!isUniqueViolation(err, 'leads_open_phone_uq')) throw err;
      const [open] = await this.db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(eq(leads.phone, input.phone), inArray(leads.status, ['new', 'contacted', 'trial'])),
        );
      throw new AppException(HttpStatus.CONFLICT, 'LEAD_EXISTS', { leadId: open?.id ?? null });
    }
  }

  /**
   * Saytdan ariza: manba — `website`, izoh — `notes`. Ochiq lid bo'lsa — yangisi yaratilmaydi
   * (javob o'zgarmaydi), noma'lum kurs — e'tiborsiz.
   */
  async createPublic(
    ctx: AuditContext,
    v: { fullName: string; phone: string; courseId: string | null; comment: string | null },
  ): Promise<void> {
    const courseId = v.courseId && (await this.courses.isActive(v.courseId)) ? v.courseId : null;
    try {
      await this.create(ctx, {
        fullName: v.fullName,
        phone: v.phone,
        courseId,
        source: 'website',
        notes: v.comment,
      });
    } catch (err) {
      if (!(err instanceof AppException && err.code === 'LEAD_EXISTS')) throw err;
    }
  }

  async update(ctx: AuditContext, id: string, patch: UpdateLeadRequest): Promise<LeadDto> {
    await this.assertRefs(patch);
    return this.write({
      ctx,
      action: 'lead.update',
      id,
      change: async (_tx, l) => {
        assertEditable(l);
        return patch.fullName ? { ...patch, searchName: normalizeUz(patch.fullName) } : patch;
      },
    });
  }

  /** Kanban ustuni (`won` — faqat aylantirish orqali). */
  changeStatus(
    ctx: AuditContext,
    id: string,
    input: { status: Exclude<LeadStatus, 'won'>; lostReason: string | null },
  ): Promise<LeadDto> {
    return this.write({
      ctx,
      action: 'lead.status',
      id,
      change: async (_tx, l) => {
        if (!canChangeLeadStatus(l.status, input.status))
          throw new AppException(HttpStatus.CONFLICT, 'INVALID_STATUS_TRANSITION', {
            from: l.status,
            to: input.status,
          });
        return {
          status: input.status,
          lostReason: input.status === 'lost' ? input.lostReason : null,
        };
      },
    });
  }

  /** Sinov darsi: rejalashtirilgan va hali o'tmagan dars; holat → `trial`. */
  scheduleTrial(ctx: AuditContext, id: string, lessonId: string): Promise<LeadDto> {
    return this.write({
      ctx,
      action: 'lead.trial',
      id,
      change: async (_tx, l) => {
        assertEditable(l);
        const lesson = (await this.lessons.briefs([lessonId])).get(lessonId);
        if (!lesson)
          throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'lessonId' });
        if (lesson.status !== 'scheduled' || lesson.date < this.clock.today())
          throw new AppException(HttpStatus.CONFLICT, 'LESSON_NOT_SCHEDULED', {
            status: lesson.status,
          });
        return { trialLessonId: lessonId, status: 'trial' };
      },
    });
  }

  /** Umumiy: qulf → o'zgarish → holat tarixi → audit (oldin/keyin) → javob. */
  async write(c: LeadWrite, outer?: Transaction): Promise<LeadDto> {
    return (outer ?? this.db).transaction(async (tx) => {
      const [before] = await tx.select().from(leads).where(eq(leads.id, c.id)).for('update');
      if (!before) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      const set = await c.change(tx, before);
      const statusChanged = set.status !== undefined && set.status !== before.status;
      const [after] = await tx
        .update(leads)
        .set(statusChanged ? { ...set, statusChangedAt: this.clock.now() } : set)
        .where(eq(leads.id, c.id))
        .returning();
      if (!after) throw new Error('lid yangilanmadi');
      if (statusChanged)
        await tx
          .insert(leadEvents)
          .values({ leadId: c.id, status: after.status, actorId: c.ctx.actorId });
      await this.audit.record(
        c.ctx,
        {
          action: c.action,
          entity: 'lead',
          entityId: c.id,
          before: leadAudit(before),
          after: leadAudit(after),
        },
        tx,
      );
      return this.query.detail(c.id, tx);
    });
  }

  private async assertRefs(v: { courseId?: string | null; assignedTo?: string | null }) {
    if (v.courseId && !(await this.courses.isActive(v.courseId)))
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'courseId' });
    if (v.assignedTo && !(await this.staff.isActiveManager(v.assignedTo)))
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'assignedTo' });
  }
}

/** Yopilgan (yozildi / rad etdi) lid tahrirlanmaydi — avval qayta oching. */
function assertEditable(l: LeadRow): void {
  if (l.status === 'won' || l.status === 'lost')
    throw new AppException(HttpStatus.CONFLICT, 'LEAD_CLOSED', { status: l.status });
}
