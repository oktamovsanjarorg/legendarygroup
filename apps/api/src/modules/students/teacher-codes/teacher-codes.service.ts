import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { SaveTeacherCodesRequest, TeacherCodesResult } from '@lg/contracts';
import {
  type Database,
  enrollments,
  isUniqueViolation,
  students,
  teacherStudentCodes,
  type Transaction,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, asc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { RequestUser } from '../../auth/index.js';
import { GroupScopeService } from '../../org/index.js';
import { suggestCodes } from './teacher-codes.policy.js';

const CODE_UQ = 'teacher_student_codes_teacher_code_uq';

/**
 * Ustozning oʻz oʻquvchi kodlari (T-128, Q-92). Faqat ustoz oʻz guruhidagi (bugun yozilgan)
 * oʻquvchilarga kod beradi; kod bazasi ustozniki — boshqa ustoz kodlari koʻrinmaydi.
 */
@Injectable()
export class TeacherCodesService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(GroupScopeService) private readonly groups: GroupScopeService,
  ) {}

  async list(user: RequestUser, groupId: string): Promise<TeacherCodesResult> {
    await this.assertTeacherOf(user, groupId);
    return this.listIn(this.db, user.id, groupId);
  }

  async save(
    ctx: AuditContext,
    user: RequestUser,
    req: SaveTeacherCodesRequest,
  ): Promise<TeacherCodesResult> {
    await this.assertTeacherOf(user, req.groupId);
    try {
      return await this.db.transaction(async (tx) => {
        const roster = new Set((await this.roster(tx, req.groupId)).map((r) => r.id));
        if (req.items.some((i) => !roster.has(i.studentId))) {
          throw new AppException(HttpStatus.NOT_FOUND, 'STUDENT_NOT_FOUND');
        }
        const before = await this.codesFor(
          user.id,
          req.items.map((i) => i.studentId),
          tx,
        );
        await this.replace(tx, user.id, req.items);
        for (const i of req.items) {
          const old = before.get(i.studentId) ?? null;
          if (old === i.code) continue;
          await this.audit.record(
            ctx,
            {
              action: 'student.teacher_code_set',
              entity: 'student',
              entityId: i.studentId,
              before: { code: old },
              after: { code: i.code },
            },
            tx,
          );
        }
        return this.listIn(tx, user.id, req.groupId);
      });
    } catch (err) {
      if (isUniqueViolation(err, CODE_UQ)) {
        throw new AppException(HttpStatus.CONFLICT, 'STUDENT_CODE_TAKEN');
      }
      throw err;
    }
  }

  /** Test importi/shabloni uchun (tests moduli): ustozning shu oʻquvchilarga bergan kodlari. */
  async codesFor(
    teacherId: string,
    studentIds: readonly string[],
    tx: Transaction | Database = this.db,
  ): Promise<Map<string, number>> {
    if (studentIds.length === 0) return new Map();
    const rows = await tx
      .select({ studentId: teacherStudentCodes.studentId, code: teacherStudentCodes.code })
      .from(teacherStudentCodes)
      .where(
        and(
          eq(teacherStudentCodes.teacherId, teacherId),
          inArray(teacherStudentCodes.studentId, [...studentIds]),
        ),
      );
    return new Map(rows.map((r) => [r.studentId, r.code]));
  }

  /** Almashtirish (A:1↔B:2) bir soʻrovda ishlashi uchun — avval oʻchiriladi, keyin yoziladi. */
  private async replace(
    tx: Transaction,
    teacherId: string,
    items: SaveTeacherCodesRequest['items'],
  ): Promise<void> {
    await tx.delete(teacherStudentCodes).where(
      and(
        eq(teacherStudentCodes.teacherId, teacherId),
        inArray(
          teacherStudentCodes.studentId,
          items.map((i) => i.studentId),
        ),
      ),
    );
    const rows = items.flatMap((i) =>
      i.code === null ? [] : [{ teacherId, studentId: i.studentId, code: i.code }],
    );
    if (rows.length > 0) await tx.insert(teacherStudentCodes).values(rows);
  }

  private async listIn(
    tx: Transaction | Database,
    teacherId: string,
    groupId: string,
  ): Promise<TeacherCodesResult> {
    const roster = await this.roster(tx, groupId);
    const own = await tx
      .select({ studentId: teacherStudentCodes.studentId, code: teacherStudentCodes.code })
      .from(teacherStudentCodes)
      .where(eq(teacherStudentCodes.teacherId, teacherId));
    const byStudent = new Map(own.map((r) => [r.studentId, r.code]));
    const rows = roster.map((r) => ({ studentId: r.id, code: byStudent.get(r.id) ?? null }));
    const suggested = suggestCodes(rows, new Set(own.map((r) => r.code)));
    return {
      items: roster.map((r) => ({
        studentId: r.id,
        fullName: r.fullName,
        code: byStudent.get(r.id) ?? null,
        suggested: suggested.get(r.id) ?? null,
      })),
    };
  }

  /** Guruhga bugun yozilgan faol oʻquvchilar (ism boʻyicha). */
  private roster(tx: Transaction | Database, groupId: string) {
    const today = this.clock.today();
    return tx
      .select({ id: students.id, fullName: students.fullName })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.groupId, groupId),
          lte(enrollments.startDate, today),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, today)),
          isNull(students.archivedAt),
        ),
      )
      .orderBy(asc(students.fullName));
  }

  /** Faqat ustoz (oʻz kod bazasi); begona guruh — 404 (mavjudligi oshkor qilinmaydi). */
  private async assertTeacherOf(user: RequestUser, groupId: string): Promise<void> {
    if (user.role !== 'teacher') throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    await this.groups.assertVisible(user, groupId);
  }
}
