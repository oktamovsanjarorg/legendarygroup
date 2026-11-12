import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  Course,
  CreateCourseRequest,
  OrgListFilter,
  UpdateCourseRequest,
} from '@lg/contracts';
import { courses, type CourseRow, type Database, groups, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { asc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { changedFields } from '../../common/audit/audit-diff.js';
import { COURSE_AUDIT_FIELDS, toCourse } from './org.serializer.js';
import { assertNoCurrentGroups } from './group-validation.js';
import {
  archivedFilter,
  type ArchiveVerb,
  assertArchiveTransition,
  withNameConflict,
} from '../../common/db/archive.js';

type CreateInput = z.output<typeof CreateCourseRequest>;

const NAME_UQ = 'courses_branch_name_active_uq';

/** Kurslar (T-102, FR-ORG-1): CRUD, arxivlash. Har yozish — audit (before/after) bilan. */
@Injectable()
export class CoursesService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(filter: OrgListFilter): Promise<Course[]> {
    const rows = await this.db
      .select()
      .from(courses)
      .where(archivedFilter(courses.archivedAt, filter))
      .orderBy(asc(courses.name), asc(courses.id));
    return rows.map(toCourse);
  }

  async get(id: string): Promise<Course> {
    const [row] = await this.db.select().from(courses).where(eq(courses.id, id));
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return toCourse(row);
  }

  async create(ctx: AuditContext, input: CreateInput): Promise<Course> {
    return withNameConflict(NAME_UQ, 'COURSE_NAME_TAKEN', () =>
      this.db.transaction(async (tx) => {
        const [row] = await tx.insert(courses).values(input).returning();
        if (!row) throw new Error('kurs yaratilmadi');
        const course = toCourse(row);
        await this.audit.record(
          ctx,
          { action: 'course.create', entity: 'course', entityId: row.id, after: course },
          tx,
        );
        return course;
      }),
    );
  }

  async update(ctx: AuditContext, id: string, patch: UpdateCourseRequest): Promise<Course> {
    return withNameConflict(NAME_UQ, 'COURSE_NAME_TAKEN', () =>
      this.db.transaction(async (tx) => {
        const current = await this.lock(tx, id);
        if (current.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'ARCHIVED_READ_ONLY');
        const [row] = await tx.update(courses).set(patch).where(eq(courses.id, id)).returning();
        return this.recordChange(tx, { ctx, action: 'course.update', before: current, after: row });
      }),
    );
  }

  /** Arxivlash / arxivdan chiqarish. Yakunlanmagan guruhli kurs arxivlanmaydi (Q-66). */
  async setArchived(ctx: AuditContext, id: string, verb: ArchiveVerb): Promise<Course> {
    return withNameConflict(NAME_UQ, 'COURSE_NAME_TAKEN', () =>
      this.db.transaction(async (tx) => {
        const current = await this.lock(tx, id);
        assertArchiveTransition(current.archivedAt, verb);
        if (verb === 'archive') await assertNoCurrentGroups(tx, groups.courseId, id);
        const archivedAt = verb === 'archive' ? this.clock.now() : null;
        const [row] = await tx
          .update(courses)
          .set({ archivedAt })
          .where(eq(courses.id, id))
          .returning();
        return this.recordChange(tx, {
          ctx,
          action: `course.${verb}`,
          before: current,
          after: row,
        });
      }),
    );
  }

  private async lock(tx: Transaction, id: string): Promise<CourseRow> {
    const [row] = await tx.select().from(courses).where(eq(courses.id, id)).for('update');
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return row;
  }

  private async recordChange(
    tx: Transaction,
    c: { ctx: AuditContext; action: string; before: CourseRow; after: CourseRow | undefined },
  ): Promise<Course> {
    if (!c.after) throw new Error('kurs yangilanmadi');
    const result = toCourse(c.after);
    const diff = changedFields(toCourse(c.before), result, COURSE_AUDIT_FIELDS);
    await this.audit.record(
      c.ctx,
      { action: c.action, entity: 'course', entityId: c.after.id, ...diff },
      tx,
    );
    return result;
  }
}
