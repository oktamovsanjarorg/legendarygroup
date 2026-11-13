import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AttendanceRecord,
  AttendanceStatus,
  LessonAttendance,
  MarkAttendanceInput,
  StudentAttendanceHistoryQueryInput,
} from '@lg/contracts';
import { canEditAttendance, type Clock } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService } from '../org/index.js';
import { OutboxService } from '../outbox/index.js';
import { StudentScopeService } from '../students/index.js';
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
    @Inject(OutboxService) private readonly outbox: OutboxService,
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
    const policy = await this.assertAttendancePolicy(user, lesson, input, now);

    const prevRecords = await this.repo.findLessonAttendance(lessonId);
    const prevMap = new Map(prevRecords.map((r) => [r.studentId, r.status]));

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

    await this.publishAttendanceEvents(lessonId, input.items, prevMap, now.toISOString());
    return this.getLessonAttendance(user, lessonId);
  }

  private async assertAttendancePolicy(
    user: RequestUser,
    lesson: { groupId: string; date: string },
    input: MarkAttendanceInput,
    now: Date,
  ) {
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

    const expected = await this.repo.findExpectedStudents(lesson.groupId, lesson.date);
    const validStudentIds = new Set(expected.map((s) => s.id));
    for (const item of input.items) {
      if (!validStudentIds.has(item.studentId)) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'STUDENT_NOT_ENROLLED');
      }
    }
    return policy;
  }

  private async publishAttendanceEvents(
    lessonId: string,
    items: MarkAttendanceInput['items'],
    prevMap: Map<string, string>,
    markedAt: string,
  ): Promise<void> {
    for (const item of items) {
      const prevStatus = prevMap.get(item.studentId) ?? null;
      await this.outbox.publish('AttendanceMarked', {
        lessonId,
        studentId: item.studentId,
        status: item.status,
        lateMinutes: item.status === 'late' ? (item.lateMinutes ?? null) : null,
        previousStatus: prevStatus,
        markedAt,
      });
    }
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
