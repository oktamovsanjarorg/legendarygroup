import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  enrollmentFreezes,
  enrollments,
  leads,
  studentGuardians,
  students,
  teacherStudentCodes,
  type Transaction,
} from '@lg/db';
import { eq, inArray } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';

/**
 * Q-124: arxivdagi o'quvchini butunlay o'chirish — o'quvchi modulining o'z jadvallari. Pul tarixi
 * yo'qligini chaqiruvchi (billing `StudentDeleteService`) shu tranzaksiyada tekshiradi.
 * Davomat, baho, test natijasi, ustoz izohi, kelmaslik xabari — FK `ON DELETE CASCADE` (DB);
 * murojaatlardagi havola — `SET NULL`. Ota-ona foydalanuvchisi qoladi (boshqa farzandi bo'lishi
 * mumkin). Audit yozuvlari (`entity_id` matn) saqlanadi.
 */
@Injectable()
export class StudentPurgeService {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  /** O'quvchini qulflaydi; arxivda bo'lmasa — 409. */
  async lockArchived(tx: Transaction, id: string) {
    const [s] = await tx.select().from(students).where(eq(students.id, id)).for('update');
    if (!s) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (!s.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'STUDENT_NOT_ARCHIVED');
    return s;
  }

  async purge(ctx: AuditContext, id: string, tx: Transaction): Promise<void> {
    const s = await this.lockArchived(tx, id);
    const own = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(eq(enrollments.studentId, id));
    const ids = own.map((e) => e.id);
    if (ids.length > 0) {
      await tx.delete(enrollmentFreezes).where(inArray(enrollmentFreezes.enrollmentId, ids));
      await tx.delete(enrollments).where(inArray(enrollments.id, ids));
    }
    await tx.delete(studentGuardians).where(eq(studentGuardians.studentId, id));
    await tx.delete(teacherStudentCodes).where(eq(teacherStudentCodes.studentId, id));
    // «won» lid shu o'quvchining o'zi (CHECK: won ⇔ student_id) — u ham ketadi.
    const lead = await tx.delete(leads).where(eq(leads.studentId, id)).returning({ id: leads.id });
    await tx.delete(students).where(eq(students.id, id));
    await this.audit.record(
      ctx,
      {
        action: 'student.delete',
        entity: 'student',
        entityId: id,
        before: {
          code: s.code,
          fullName: s.fullName,
          archivedAt: s.archivedAt?.toISOString() ?? null,
          enrollments: ids.length,
          leads: lead.length,
        },
        after: null,
      },
      tx,
    );
  }
}
