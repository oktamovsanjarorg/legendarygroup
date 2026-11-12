import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CreateStudentRequest, StudentDetail, UpdateStudentRequest } from '@lg/contracts';
import {
  type Database,
  studentGuardians,
  students,
  type StudentRow,
  type Transaction,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { normalizeUz } from '@lg/i18n';
import { and, eq, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import { changedFields, maskPii } from '../../common/audit/audit-diff.js';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { FilesService } from '../files/index.js';
import { type ArchiveVerb, assertArchiveTransition } from '../../common/db/archive.js';
import { assertUniquePhones, findOrCreateGuardian, normalizePrimary } from './guardian-links.js';
import { StudentsQueryService } from './students-query.service.js';
import { STUDENT_AUDIT_FIELDS, toDetail } from './students.serializer.js';

type CreateInput = z.output<typeof CreateStudentRequest>;
const STAFF_VIEW = { role: 'admin', guardianId: null } as const;

/** O'quvchi yozish amallari (T-105, FR-STU-1/2/6). Har amal — tranzaksiya + audit. */
@Injectable()
export class StudentsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(StudentsQueryService) private readonly query: StudentsQueryService,
  ) {}

  /** `outer` — chaqiruvchi tranzaksiyasi ichida (savepoint), masalan lidni aylantirish (T-107). */
  async create(ctx: AuditContext, input: CreateInput, outer?: Transaction): Promise<StudentDetail> {
    const { guardians: guardianInputs, allowDuplicate, ...fields } = input;
    assertUniquePhones(guardianInputs);
    const links = normalizePrimary(guardianInputs);
    if (fields.photoFileId) await this.assertPhoto(fields.photoFileId);
    const searchName = normalizeUz(fields.fullName);
    return (outer ?? this.db).transaction(async (tx) => {
      if (!allowDuplicate) await this.assertNoDuplicate(tx, searchName, fields.birthDate ?? null);
      const [row] = await tx
        .insert(students)
        .values({ ...fields, searchName })
        .returning();
      if (!row) throw new Error('oʻquvchi yaratilmadi');
      for (const g of links) {
        const { guardian } = await findOrCreateGuardian(tx, g);
        await tx.insert(studentGuardians).values({
          studentId: row.id,
          guardianId: guardian.id,
          relation: g.relation,
          isPrimary: g.isPrimary,
          notify: g.notify,
        });
      }
      const detail = toDetail(row, await this.linksIn(tx, row.id), STAFF_VIEW);
      const { guardians: _g, ...after } = detail;
      await this.audit.record(
        ctx,
        {
          action: 'student.create',
          entity: 'student',
          entityId: row.id,
          after: { ...maskPii(after), guardians: links.length },
        },
        tx,
      );
      return detail;
    });
  }

  async update(ctx: AuditContext, id: string, patch: UpdateStudentRequest): Promise<StudentDetail> {
    if (patch.photoFileId) await this.assertPhoto(patch.photoFileId);
    return this.db.transaction(async (tx) => {
      const current = await this.lock(tx, id);
      if (current.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'ARCHIVED_READ_ONLY');
      const set = patch.fullName ? { ...patch, searchName: normalizeUz(patch.fullName) } : patch;
      const [row] = await tx.update(students).set(set).where(eq(students.id, id)).returning();
      return this.recordChange(tx, { ctx, action: 'student.update', before: current, after: row });
    });
  }

  /** FR-STU-6: o'chirilmaydi — arxivlanadi; ota-ona tarixi ochiq qoladi (02 §3). */
  async setArchived(ctx: AuditContext, id: string, verb: ArchiveVerb): Promise<StudentDetail> {
    return this.db.transaction(async (tx) => {
      const current = await this.lock(tx, id);
      assertArchiveTransition(current.archivedAt, verb);
      const archivedAt = verb === 'archive' ? this.clock.now() : null;
      const [row] = await tx
        .update(students)
        .set({ archivedAt })
        .where(eq(students.id, id))
        .returning();
      return this.recordChange(tx, { ctx, action: `student.${verb}`, before: current, after: row });
    });
  }

  /** Dublikat ogohlantirishi: bir xil (normalizatsiyalangan) ism + tug'ilgan sana, faollar ichida. */
  private async assertNoDuplicate(tx: Transaction, searchName: string, birthDate: string | null) {
    if (!birthDate) return;
    const matches = await tx
      .select({ id: students.id, code: students.code, fullName: students.fullName })
      .from(students)
      .where(
        and(
          eq(students.searchName, searchName),
          eq(students.birthDate, birthDate),
          isNull(students.archivedAt),
        ),
      );
    if (matches.length > 0)
      throw new AppException(HttpStatus.CONFLICT, 'POSSIBLE_DUPLICATE', { matches });
  }

  private async assertPhoto(fileId: string): Promise<void> {
    if ((await this.files.purposeOf(fileId)) !== 'student_photo')
      throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_FILE');
  }

  private async lock(tx: Transaction, id: string): Promise<StudentRow> {
    const [row] = await tx.select().from(students).where(eq(students.id, id)).for('update');
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return row;
  }

  private async linksIn(tx: Transaction, id: string) {
    return this.query.links(id, tx);
  }

  private async recordChange(
    tx: Transaction,
    c: { ctx: AuditContext; action: string; before: StudentRow; after: StudentRow | undefined },
  ): Promise<StudentDetail> {
    if (!c.after) throw new Error('oʻquvchi yangilanmadi');
    const links = await this.linksIn(tx, c.after.id);
    const result = toDetail(c.after, links, STAFF_VIEW);
    const diff = changedFields(toDetail(c.before, links, STAFF_VIEW), result, STUDENT_AUDIT_FIELDS);
    await this.audit.record(
      c.ctx,
      { action: c.action, entity: 'student', entityId: c.after.id, ...diff },
      tx,
    );
    return result;
  }
}
