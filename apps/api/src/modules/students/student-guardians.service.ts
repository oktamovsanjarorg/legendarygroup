import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { GuardianInput, StudentGuardian, UpdateGuardianLinkRequest } from '@lg/contracts';
import { type Database, guardians, studentGuardians, students, type Transaction } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { maskPii } from '../../common/audit/audit-diff.js';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ensurePrimary, findOrCreateGuardian, makePrimary } from './guardian-links.js';
import { StudentsQueryService } from './students-query.service.js';
import { toGuardian } from './students.serializer.js';

type LinkInput = z.output<typeof GuardianInput>;
const STAFF_VIEW = { role: 'admin', guardianId: null } as const;

/**
 * O'quvchi ↔ ota-ona bog'lanishi (FR-STU-2, FR-AUTH-6). Uzilganda ota-ona kirishi darhol
 * yopiladi — scope har so'rovda `student_guardians`dan o'qiladi (02 §3).
 */
@Injectable()
export class StudentGuardiansService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(StudentsQueryService) private readonly query: StudentsQueryService,
  ) {}

  async link(ctx: AuditContext, studentId: string, input: LinkInput): Promise<StudentGuardian[]> {
    return this.db.transaction(async (tx) => {
      await this.lockActiveStudent(tx, studentId);
      const { guardian, created } = await findOrCreateGuardian(tx, input);
      const [linked] = await tx
        .insert(studentGuardians)
        .values({
          studentId,
          guardianId: guardian.id,
          relation: input.relation,
          isPrimary: false,
          notify: input.notify,
        })
        .onConflictDoNothing()
        .returning();
      if (!linked) throw new AppException(HttpStatus.CONFLICT, 'GUARDIAN_ALREADY_LINKED');
      if (input.isPrimary) await makePrimary(tx, studentId, guardian.id);
      else await ensurePrimary(tx, studentId);
      await this.audit.record(
        ctx,
        {
          action: 'student.guardian_link',
          entity: 'student',
          entityId: studentId,
          after: maskPii({
            guardianId: guardian.id,
            phone: guardian.phone,
            relation: input.relation,
            guardianCreated: created,
          }),
        },
        tx,
      );
      return this.result(tx, studentId);
    });
  }

  async update(
    ctx: AuditContext,
    ids: { studentId: string; guardianId: string },
    patch: UpdateGuardianLinkRequest,
  ): Promise<StudentGuardian[]> {
    return this.db.transaction(async (tx) => {
      await this.lockActiveStudent(tx, ids.studentId);
      const before = await this.lockLink(tx, ids);
      const { isPrimary, ...rest } = patch;
      if (Object.keys(rest).length > 0)
        await tx.update(studentGuardians).set(rest).where(this.linkWhere(ids));
      if (isPrimary === true) await makePrimary(tx, ids.studentId, ids.guardianId);
      if (isPrimary === false) {
        await tx.update(studentGuardians).set({ isPrimary: false }).where(this.linkWhere(ids));
        await ensurePrimary(tx, ids.studentId);
      }
      await this.audit.record(
        ctx,
        {
          action: 'student.guardian_update',
          entity: 'student',
          entityId: ids.studentId,
          before: { guardianId: ids.guardianId, relation: before.relation, notify: before.notify },
          after: { guardianId: ids.guardianId, ...patch },
        },
        tx,
      );
      return this.result(tx, ids.studentId);
    });
  }

  /** Bog'lanishni uzish (masalan, noto'g'ri ota-ona). Arxivdagi o'quvchida ham mumkin. */
  async unlink(
    ctx: AuditContext,
    ids: { studentId: string; guardianId: string },
  ): Promise<StudentGuardian[]> {
    return this.db.transaction(async (tx) => {
      const before = await this.lockLink(tx, ids);
      await tx.delete(studentGuardians).where(this.linkWhere(ids));
      if (before.isPrimary) await ensurePrimary(tx, ids.studentId);
      await this.audit.record(
        ctx,
        {
          action: 'student.guardian_unlink',
          entity: 'student',
          entityId: ids.studentId,
          before: { guardianId: ids.guardianId, relation: before.relation },
        },
        tx,
      );
      return this.result(tx, ids.studentId);
    });
  }

  /** Ism tuzatish (barcha farzandlari kartochkasida ko'rinadi). Telefon — bog'lash kaliti, o'zgarmaydi. */
  async rename(
    ctx: AuditContext,
    guardianId: string,
    fullName: string,
  ): Promise<{ id: string; fullName: string }> {
    return this.db.transaction(async (tx) => {
      const [before] = await tx
        .select({ fullName: guardians.fullName })
        .from(guardians)
        .where(eq(guardians.id, guardianId))
        .for('update');
      if (!before) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      await tx.update(guardians).set({ fullName }).where(eq(guardians.id, guardianId));
      await this.audit.record(
        ctx,
        {
          action: 'guardian.rename',
          entity: 'guardian',
          entityId: guardianId,
          before: { fullName: before.fullName },
          after: { fullName },
        },
        tx,
      );
      return { id: guardianId, fullName };
    });
  }

  private linkWhere(ids: { studentId: string; guardianId: string }) {
    return and(
      eq(studentGuardians.studentId, ids.studentId),
      eq(studentGuardians.guardianId, ids.guardianId),
    );
  }

  private async lockLink(tx: Transaction, ids: { studentId: string; guardianId: string }) {
    const [row] = await tx.select().from(studentGuardians).where(this.linkWhere(ids)).for('update');
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return row;
  }

  private async lockActiveStudent(tx: Transaction, id: string): Promise<void> {
    const [s] = await tx
      .select({ archivedAt: students.archivedAt })
      .from(students)
      .where(eq(students.id, id))
      .for('update');
    if (!s) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (s.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'ARCHIVED_READ_ONLY');
  }

  private async result(tx: Transaction, studentId: string): Promise<StudentGuardian[]> {
    return (await this.query.links(studentId, tx)).map((l) => toGuardian(l, STAFF_VIEW));
  }
}
