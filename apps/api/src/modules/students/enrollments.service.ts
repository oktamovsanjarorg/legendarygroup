import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { EnrollmentDto } from '@lg/contracts';
import {
  type Database,
  enrollmentFreezes,
  type EnrollmentRow,
  enrollments,
  isExclusionViolation,
  students,
  type Transaction,
} from '@lg/db';
import { type Clock, peakConcurrency, transferSplit } from '@lg/domain';
import { and, asc, eq, gt, gte, lte } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { GroupsQueryService } from '../org/index.js';
import { enrollmentAudit, enrollmentSpan, toEnrollment } from './enrollments.serializer.js';

interface EnrollInput {
  studentId: string;
  groupId: string;
  startDate: string;
  discountPercent?: number | null;
}

/**
 * Guruhga yozish, chiqarish, ko'chirish (T-106, FR-STU-3). Sig'im — guruh qatori qulflangan
 * holda tekshiriladi (parallel yozilishda ham oshmaydi); takroriy davr — DB EXCLUDE.
 */
@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GroupsQueryService) private readonly groups: GroupsQueryService,
  ) {}

  /** `outer` — chaqiruvchi tranzaksiyasi ichida (savepoint), masalan lidni aylantirish (T-107). */
  async enroll(ctx: AuditContext, input: EnrollInput, outer?: Transaction): Promise<EnrollmentDto> {
    return this.mapOverlap(() =>
      (outer ?? this.db).transaction(async (tx) => {
        const { row, groupName } = await this.insert(tx, input);
        await this.audit.record(
          ctx,
          {
            action: 'enrollment.create',
            entity: 'enrollment',
            entityId: row.id,
            after: enrollmentAudit(row),
          },
          tx,
        );
        return toEnrollment(row, groupName, [], this.clock.today());
      }),
    );
  }

  /** Chiqarish (ketdi/tugatdi); kelajakdagi sana — rejalashtirilgan chiqish. */
  async end(
    ctx: AuditContext,
    id: string,
    input: { endDate: string; reason: 'left' | 'finished'; note: string | null },
  ): Promise<EnrollmentDto> {
    return this.db.transaction(async (tx) => {
      const current = await this.lockOpen(tx, id);
      const row = await this.close(tx, current, { ...input, endReason: input.reason });
      await this.audit.record(
        ctx,
        {
          action: 'enrollment.end',
          entity: 'enrollment',
          entityId: id,
          before: enrollmentAudit(current),
          after: enrollmentAudit(row),
        },
        tx,
      );
      return this.dto(tx, row);
    });
  }

  /** Ko'chirish: eski `date - 1` da (`transferred`), yangi guruhda `date` dan; chegirma saqlanadi. */
  async transfer(
    ctx: AuditContext,
    id: string,
    input: { toGroupId: string; date: string; note: string | null },
  ): Promise<EnrollmentDto> {
    return this.mapOverlap(() =>
      this.db.transaction(async (tx) => {
        const current = await this.lockOpen(tx, id);
        if (current.groupId === input.toGroupId)
          throw new AppException(HttpStatus.CONFLICT, 'SAME_GROUP');
        const { endOld, startNew } = transferSplit(input.date);
        await this.close(tx, current, {
          endDate: endOld,
          endReason: 'transferred',
          note: input.note,
        });
        const { row, groupName } = await this.insert(tx, {
          studentId: current.studentId,
          groupId: input.toGroupId,
          startDate: startNew,
          discountPercent: current.discountPercent,
        });
        await this.audit.record(
          ctx,
          {
            action: 'enrollment.transfer',
            entity: 'enrollment',
            entityId: row.id,
            before: enrollmentAudit(current),
            after: { ...enrollmentAudit(row), fromEnrollmentId: current.id },
          },
          tx,
        );
        return toEnrollment(row, groupName, [], this.clock.today());
      }),
    );
  }

  private async insert(tx: Transaction, input: EnrollInput) {
    const [student] = await tx
      .select({ archivedAt: students.archivedAt })
      .from(students)
      .where(eq(students.id, input.studentId))
      .for('update');
    if (!student)
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'studentId' });
    if (student.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'STUDENT_ARCHIVED');
    const group = await this.groups.lockForEnrollment(tx, input.groupId);
    if (!group)
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'groupId' });
    if (group.status === 'finished') throw new AppException(HttpStatus.CONFLICT, 'GROUP_FINISHED');
    if (input.startDate < group.startDate || (group.endDate && input.startDate > group.endDate))
      throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', {
        startDate: group.startDate,
        endDate: group.endDate,
      });
    const existing = await tx.select().from(enrollments).where(eq(enrollments.groupId, group.id));
    const window = { from: input.startDate, to: group.endDate };
    if (peakConcurrency(existing.map(enrollmentSpan), window) >= group.maxStudents)
      throw new AppException(HttpStatus.CONFLICT, 'GROUP_FULL', { capacity: group.maxStudents });
    const [row] = await tx.insert(enrollments).values(input).returning();
    if (!row) throw new Error('enrollment yaratilmadi');
    return { row, groupName: group.name };
  }

  /** Tugatish + tugash sanasidan keyingi muzlatishlarni qirqish/o'chirish. */
  private async close(
    tx: Transaction,
    e: EnrollmentRow,
    c: { endDate: string; endReason: 'left' | 'finished' | 'transferred'; note: string | null },
  ): Promise<EnrollmentRow> {
    if (c.endDate < e.startDate)
      throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', {
        startDate: e.startDate,
      });
    const own = eq(enrollmentFreezes.enrollmentId, e.id);
    await tx.delete(enrollmentFreezes).where(and(own, gt(enrollmentFreezes.fromDate, c.endDate)));
    await tx
      .update(enrollmentFreezes)
      .set({ toDate: c.endDate })
      .where(
        and(
          own,
          lte(enrollmentFreezes.fromDate, c.endDate),
          gte(enrollmentFreezes.toDate, c.endDate),
        ),
      );
    const [row] = await tx
      .update(enrollments)
      .set({ endDate: c.endDate, endReason: c.endReason, endNote: c.note })
      .where(eq(enrollments.id, e.id))
      .returning();
    if (!row) throw new Error('enrollment yangilanmadi');
    return row;
  }

  async lock(tx: Transaction, id: string): Promise<EnrollmentRow> {
    const [e] = await tx.select().from(enrollments).where(eq(enrollments.id, id)).for('update');
    if (!e) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return e;
  }

  /** Yakunlanmagan (chiqish sababi qo'yilmagan) enrollment. */
  async lockOpen(tx: Transaction, id: string): Promise<EnrollmentRow> {
    const e = await this.lock(tx, id);
    if (e.endReason !== null) throw new AppException(HttpStatus.CONFLICT, 'ENROLLMENT_ENDED');
    return e;
  }

  async dto(tx: Transaction, e: EnrollmentRow): Promise<EnrollmentDto> {
    const freezes = await tx
      .select()
      .from(enrollmentFreezes)
      .where(eq(enrollmentFreezes.enrollmentId, e.id))
      .orderBy(asc(enrollmentFreezes.fromDate));
    const names = await this.groups.namesOf([e.groupId]);
    return toEnrollment(e, names.get(e.groupId) ?? '—', freezes, this.clock.today());
  }

  private async mapOverlap<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (err) {
      if (isExclusionViolation(err, 'enrollments_no_overlap'))
        throw new AppException(HttpStatus.CONFLICT, 'ALREADY_ENROLLED');
      throw err;
    }
  }
}
