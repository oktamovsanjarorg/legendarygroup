import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type {
  AttendanceRecord,
  AttendanceStatus,
  LessonAttendance,
  MarkAttendanceInput,
  StudentAttendanceHistoryQueryInput,
} from '@lg/contracts';
import { canEditAttendance, type Clock, shouldNotifyAbsenceOrLate } from '@lg/domain';
import { guardians, studentGuardians } from '@lg/db';
import { eq, inArray } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Database } from '@lg/db';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService } from '../org/index.js';
import { StudentScopeService } from '../students/index.js';
import { TelegramOutbox } from '../telegram/index.js';
import { AttendanceRepository, type EnrichedAttendanceRow } from './attendance.repository.js';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @Inject(AttendanceRepository) private readonly repo: AttendanceRepository,
    @Inject(GroupScopeService) private readonly groupScope: GroupScopeService,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Optional() @Inject(TelegramOutbox) private readonly telegramOutbox?: TelegramOutbox,
  ) {}

  /** Dars davomati ma'lumotlari va kutilayotgan o'quvchilar ro'yxati (FR-ATT-1). */
  async getLessonAttendance(user: RequestUser, lessonId: string): Promise<LessonAttendance> {
    const lesson = await this.repo.findLessonById(lessonId);
    if (!lesson) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    await this.assertCanViewLesson(user, lesson);

    const now = this.clock.now();
    const hasEditPast = user.role === 'admin' || user.role === 'director';
    const policy = canEditAttendance({
      lessonDate: lesson.date,
      userRole: user.role,
      hasEditPastPermission: hasEditPast,
      now,
    });

    const expected = await this.repo.findExpectedStudents(lesson.groupId, lesson.date);
    const records = await this.repo.findLessonAttendance(lessonId);

    return {
      lessonId: lesson.id,
      groupId: lesson.groupId,
      groupName: lesson.groupName,
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      teacherId: lesson.teacherId ?? '',
      teacherName: lesson.teacherName ?? '—',
      canEdit: policy.allowed,
      records: records.map((r) => this.serializeRecord(r)),
      expectedStudents: expected,
    };
  }

  /** Davomat belgilash / tahrirlash (FR-ATT-2, BR-30, BR-31, BR-32). */
  async markAttendance(
    user: RequestUser,
    lessonId: string,
    input: MarkAttendanceInput,
    ctx: AuditContext,
  ): Promise<LessonAttendance> {
    const lesson = await this.repo.findLessonById(lessonId);
    if (!lesson) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (lesson.status === 'cancelled')
      throw new AppException(HttpStatus.CONFLICT, 'LESSON_CANCELLED');

    await this.assertCanMarkLesson(user, lesson);

    const now = this.clock.now();
    const hasEditPast = user.role === 'admin' || user.role === 'director';
    const policy = canEditAttendance({
      lessonDate: lesson.date,
      userRole: user.role,
      hasEditPastPermission: hasEditPast,
      now,
    });

    if (!policy.allowed) {
      throw new AppException(HttpStatus.CONFLICT, 'ATTENDANCE_LOCKED_PAST');
    }
    if (policy.requiresReason && !input.changeReason) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'CHANGE_REASON_REQUIRED');
    }

    // BR-32: O'quvchi ushbu dars sanasida guruhga yozilgan bo'lishi shart
    const expected = await this.repo.findExpectedStudents(lesson.groupId, lesson.date);
    const validStudentIds = new Set(expected.map((s) => s.id));
    for (const item of input.items) {
      if (!validStudentIds.has(item.studentId)) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'STUDENT_NOT_ENROLLED');
      }
    }

    const rowsToUpsert = input.items.map((item) => ({
      lessonId,
      studentId: item.studentId,
      status: item.status,
      lateMinutes: item.status === 'late' ? (item.lateMinutes ?? null) : null,
      note: item.note ?? null,
      markedBy: user.id,
      markedAt: now,
      clientMutationId: input.clientMutationId ?? null,
    }));

    await this.repo.upsertAttendanceBatch(rowsToUpsert);

    const action = policy.requiresReason ? 'attendance.edit_past' : 'attendance.mark';
    await this.audit.record(ctx, {
      action,
      entity: 'attendance',
      entityId: lessonId,
      after: {
        count: input.items.length,
        changeReason: input.changeReason ?? null,
        clientMutationId: input.clientMutationId ?? null,
      },
    });

    // BR-31: Kelmagan / kech qolgan o'quvchilar ota-onalariga xabarnoma navbatiga qo'yish
    await this.enqueueAbsenceNotifications(lesson, input.items);

    return this.getLessonAttendance(user, lessonId);
  }

  /** O'quvchining davomat tarixi (ota-ona, ustoz, admin). */
  async getStudentHistory(user: RequestUser, query: StudentAttendanceHistoryQueryInput) {
    await this.studentScope.assertVisible(user, query.studentId);
    return this.repo.findStudentAttendance(query.studentId, query.from, query.to);
  }

  private async assertCanViewLesson(
    user: RequestUser,
    lesson: { groupId: string; teacherId: string | null },
  ): Promise<void> {
    if (user.role === 'admin' || user.role === 'director') return;
    if (user.role === 'teacher') {
      if (lesson.teacherId === user.id) return;
      await this.groupScope.assertVisible(user, lesson.groupId);
      return;
    }
    throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }

  private async assertCanMarkLesson(
    user: RequestUser,
    lesson: { groupId: string; teacherId: string | null },
  ): Promise<void> {
    if (user.role === 'admin' || user.role === 'director') return;
    if (user.role === 'teacher') {
      if (lesson.teacherId === user.id) return;
      await this.groupScope.assertVisible(user, lesson.groupId);
      return;
    }
    throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }

  private async enqueueAbsenceNotifications(
    lesson: { id: string; groupName: string; date: string; startTime: string },
    items: MarkAttendanceInput['items'],
  ): Promise<void> {
    if (!this.telegramOutbox) return;

    const notifiable = items.filter((item) => shouldNotifyAbsenceOrLate(item));
    if (notifiable.length === 0) return;

    const studentIds = notifiable.map((i) => i.studentId);
    const sgRows = await this.db
      .select({
        studentId: studentGuardians.studentId,
        guardianUserId: guardians.userId,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(inArray(studentGuardians.studentId, studentIds));

    for (const item of notifiable) {
      const match = sgRows.find((r) => r.studentId === item.studentId && r.guardianUserId);
      if (!match?.guardianUserId) continue;

      const text =
        item.status === 'absent'
          ? `Farzandingiz bugun (${lesson.date} ${lesson.startTime}) "${lesson.groupName}" darsiga kelmadi.`
          : `Farzandingiz bugun (${lesson.date} ${lesson.startTime}) "${lesson.groupName}" darsiga ${item.lateMinutes} daqiqa kech qoldi.`;

      await this.telegramOutbox.enqueue(
        {
          method: 'sendMessage',
          chatId: match.guardianUserId,
          payload: { text },
        },
        { dedupeKey: `att:${lesson.id}:${item.studentId}` },
      );
    }
  }

  private serializeRecord(r: EnrichedAttendanceRow): AttendanceRecord {
    return {
      id: r.id,
      lessonId: r.lessonId,
      studentId: r.studentId,
      studentName: r.studentName,
      studentCode: `LG-${r.studentCode}`,
      status: r.status as AttendanceStatus,
      lateMinutes: r.lateMinutes,
      note: r.note,
      markedBy: r.markedBy,
      markedByName: r.markedByName,
      markedAt: r.markedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
