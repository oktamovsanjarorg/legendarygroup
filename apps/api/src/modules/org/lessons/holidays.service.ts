import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { HolidayDto } from '@lg/contracts';
import {
  type Database,
  groups,
  holidays,
  isUniqueViolation,
  lessons,
  type Transaction,
} from '@lg/db';
import { type Clock, holidayEffect } from '@lg/domain';
import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { LessonSyncService } from './lesson-sync.service.js';

/**
 * Bayramlar (FR-ORG-5, BR-3/BR-5, Q-86). Qo'shilganda shu kundagi jadval darslari: joriy oy —
 * bekor (`holiday`, kredit), keyingi oylar — o'chiriladi. Olib tashlanganda — bayram sababli
 * bekor qilinganlar o'chirilib, jadval qayta generatsiya qilinadi. O'tgan sana o'zgarmaydi.
 */
@Injectable()
export class HolidaysService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(LessonSyncService) private readonly sync: LessonSyncService,
  ) {}

  async list(year: number): Promise<HolidayDto[]> {
    return this.db
      .select({ date: holidays.date, name: holidays.name })
      .from(holidays)
      .where(and(gte(holidays.date, `${year}-01-01`), lte(holidays.date, `${year}-12-31`)))
      .orderBy(asc(holidays.date));
  }

  async create(ctx: AuditContext, input: HolidayDto): Promise<HolidayDto> {
    this.assertFuture(input.date);
    try {
      return await this.db.transaction(async (tx) => {
        await tx.insert(holidays).values(input);
        await this.lockGroupsOn(tx, input.date);
        const regular = and(
          eq(lessons.date, input.date),
          eq(lessons.kind, 'regular'),
          eq(lessons.status, 'scheduled'),
        );
        const effect = holidayEffect(input.date, this.clock.today());
        const touched =
          effect === 'cancel'
            ? await tx
                .update(lessons)
                .set({
                  status: 'cancelled',
                  cancelSource: 'holiday',
                  cancelReason: input.name,
                  cancelledAt: this.clock.now(),
                })
                .where(regular)
                .returning({ id: lessons.id })
            : await tx.delete(lessons).where(regular).returning({ id: lessons.id });
        await this.audit.record(
          ctx,
          {
            action: 'holiday.create',
            entity: 'holiday',
            after: { ...input, effect, lessons: touched.length },
          },
          tx,
        );
        return input;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'holidays_pkey'))
        throw new AppException(HttpStatus.CONFLICT, 'HOLIDAY_EXISTS');
      throw err;
    }
  }

  async remove(ctx: AuditContext, date: string): Promise<void> {
    this.assertFuture(date);
    await this.db.transaction(async (tx) => {
      const [h] = await tx.delete(holidays).where(eq(holidays.date, date)).returning();
      if (!h) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      const ids = await tx
        .select({ id: groups.id })
        .from(groups)
        .where(inArray(groups.status, ['forming', 'active']))
        .orderBy(asc(groups.id))
        .for('update');
      await tx
        .delete(lessons)
        .where(
          and(
            eq(lessons.date, date),
            eq(lessons.cancelSource, 'holiday'),
            isNull(lessons.compensation),
          ),
        );
      let created = 0;
      for (const { id } of ids) created += (await this.sync.sync(tx, id)).created;
      await this.audit.record(
        ctx,
        { action: 'holiday.delete', entity: 'holiday', before: h, after: { lessons: created } },
        tx,
      );
    });
  }

  private assertFuture(date: string): void {
    if (date < this.clock.today()) throw new AppException(HttpStatus.BAD_REQUEST, 'LESSON_IN_PAST');
  }

  /** Shu kunda darsi bor guruhlar — sinxronlash bilan poyga bo'lmasin (tartib — deadlock'siz). */
  private async lockGroupsOn(tx: Transaction, date: string): Promise<void> {
    const rows = await tx
      .selectDistinct({ id: lessons.groupId })
      .from(lessons)
      .where(eq(lessons.date, date));
    if (rows.length === 0) return;
    await tx
      .select({ id: groups.id })
      .from(groups)
      .where(
        inArray(
          groups.id,
          rows.map((r) => r.id),
        ),
      )
      .orderBy(asc(groups.id))
      .for('update');
  }
}
