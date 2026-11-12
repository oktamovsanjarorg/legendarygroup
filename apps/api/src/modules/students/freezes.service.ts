import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { EnrollmentDto } from '@lg/contracts';
import {
  type Database,
  enrollmentFreezes,
  type EnrollmentFreezeRow,
  isExclusionViolation,
  type Transaction,
} from '@lg/db';
import { addDays, type Clock, validateFreeze } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { enrollmentSpan, freezeSpan } from './enrollments.serializer.js';
import { EnrollmentsService } from './enrollments.service.js';

type Ids = { enrollmentId: string; freezeId: string };

/**
 * Muzlatish (BR-9, T-106): ≥ 14 kun, enrollment davri ichida, kesishmaydi. O'tmishni qayta
 * yozmaslik uchun: boshlangan muzlatish o'chirilmaydi, faqat kechadan boshlab qisqartiriladi.
 * Kredit — oy yopilishida (T-203).
 */
@Injectable()
export class FreezesService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService,
  ) {}

  async create(
    ctx: AuditContext,
    enrollmentId: string,
    input: { from: string; to: string; reason: string },
  ): Promise<EnrollmentDto> {
    try {
      return await this.db.transaction(async (tx) => {
        const e = await this.enrollments.lock(tx, enrollmentId);
        const others = await this.freezesOf(tx, enrollmentId);
        const error = validateFreeze(enrollmentSpan(e), others.map(freezeSpan), input);
        if (error) throw new AppException(HttpStatus.CONFLICT, error);
        const [f] = await tx
          .insert(enrollmentFreezes)
          .values({
            enrollmentId,
            fromDate: input.from,
            toDate: input.to,
            reason: input.reason,
            approvedBy: ctx.actorId,
          })
          .returning();
        await this.record(tx, {
          ctx,
          action: 'enrollment.freeze',
          entityId: enrollmentId,
          after: { freezeId: f?.id, ...input },
        });
        return this.enrollments.dto(tx, e);
      });
    } catch (err) {
      if (isExclusionViolation(err, 'enrollment_freezes_no_overlap'))
        throw new AppException(HttpStatus.CONFLICT, 'FREEZE_OVERLAP');
      throw err;
    }
  }

  /** Erta tugatish (o'quvchi qaytdi): yangi tugash — kechadan oldin emas. */
  async end(ctx: AuditContext, ids: Ids, to: string): Promise<EnrollmentDto> {
    return this.db.transaction(async (tx) => {
      const e = await this.enrollments.lock(tx, ids.enrollmentId);
      const f = await this.lockFreeze(tx, ids);
      const earliest = addDays(this.clock.today(), -1);
      if (to < f.fromDate || to >= f.toDate || to < earliest)
        throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', { earliest });
      await tx.update(enrollmentFreezes).set({ toDate: to }).where(eq(enrollmentFreezes.id, f.id));
      await this.record(tx, {
        ctx,
        action: 'enrollment.freeze_end',
        entityId: e.id,
        before: { freezeId: f.id, to: f.toDate },
        after: { freezeId: f.id, to },
      });
      return this.enrollments.dto(tx, e);
    });
  }

  /** Hali boshlanmagan muzlatishni bekor qilish. */
  async cancel(ctx: AuditContext, ids: Ids): Promise<EnrollmentDto> {
    return this.db.transaction(async (tx) => {
      const e = await this.enrollments.lock(tx, ids.enrollmentId);
      const f = await this.lockFreeze(tx, ids);
      if (f.fromDate <= this.clock.today())
        throw new AppException(HttpStatus.CONFLICT, 'FREEZE_STARTED');
      await tx.delete(enrollmentFreezes).where(eq(enrollmentFreezes.id, f.id));
      await this.record(tx, {
        ctx,
        action: 'enrollment.freeze_cancel',
        entityId: e.id,
        before: { freezeId: f.id, from: f.fromDate, to: f.toDate },
      });
      return this.enrollments.dto(tx, e);
    });
  }

  private freezesOf(tx: Transaction, enrollmentId: string): Promise<EnrollmentFreezeRow[]> {
    return tx
      .select()
      .from(enrollmentFreezes)
      .where(eq(enrollmentFreezes.enrollmentId, enrollmentId));
  }

  private async lockFreeze(tx: Transaction, ids: Ids): Promise<EnrollmentFreezeRow> {
    const [f] = await tx
      .select()
      .from(enrollmentFreezes)
      .where(
        and(
          eq(enrollmentFreezes.id, ids.freezeId),
          eq(enrollmentFreezes.enrollmentId, ids.enrollmentId),
        ),
      )
      .for('update');
    if (!f) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return f;
  }

  private record(
    tx: Transaction,
    e: {
      ctx: AuditContext;
      action: string;
      entityId: string;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    },
  ): Promise<void> {
    const { ctx, ...entry } = e;
    return this.audit.record(ctx, { ...entry, entity: 'enrollment' }, tx);
  }
}
