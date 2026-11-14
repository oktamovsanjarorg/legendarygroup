import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type {
  GradedKind,
  GradeRecord,
  LessonGradesResponse,
  SetLessonGradesInput,
  StudentGradesQueryInput,
  TeacherComment,
  TeacherCommentVisibility,
} from '@lg/contracts';
import { validateGradeKind, validateGradeValue } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService } from '../org/index.js';
import { StudentScopeService } from '../students/index.js';
import { TelegramOutbox } from '../telegram/index.js';
import {
  type EnrichedCommentRow,
  type EnrichedGradeRow,
  GradesRepository,
} from './grades.repository.js';

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  constructor(
    @Inject(GradesRepository) private readonly repo: GradesRepository,
    @Inject(GroupScopeService) private readonly groupScope: GroupScopeService,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Optional() @Inject(TelegramOutbox) private readonly telegramOutbox?: TelegramOutbox,
  ) {}

  /** Dars baholari va izohlarini olish (FR-GRD-1). */
  async getLessonGrades(user: RequestUser, lessonId: string): Promise<LessonGradesResponse> {
    const lesson = await this.repo.findLessonWithGroup(lessonId);
    if (!lesson) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    await this.assertCanViewLesson(user, lesson);

    const gradesList = await this.repo.findGradesForLesson(lessonId);
    const commentsList = await this.repo.findCommentsForLesson(lessonId);

    // Ota-ona ko'rmaydigan internal izohlarni filtrlaymiz agar kerak bo'lsa
    const isStaff = user.role !== 'guardian';
    const filteredComments = isStaff
      ? commentsList
      : commentsList.filter((c) => c.visibility === 'guardian');

    return {
      lessonId: lesson.id,
      groupId: lesson.groupId,
      groupName: lesson.groupName,
      date: lesson.date,
      scale: lesson.gradingConfig.scale,
      allowedKinds: lesson.gradingConfig.kinds,
      grades: gradesList.map((g) => this.serializeGrade(g)),
      comments: filteredComments.map((c) => this.serializeComment(c)),
    };
  }

  /** Dars baholari va izohlarini qo'yish / tahrirlash (FR-GRD-1, 2, BR-33). */
  async setLessonGrades(
    user: RequestUser,
    lessonId: string,
    input: SetLessonGradesInput,
    ctx: AuditContext,
  ): Promise<LessonGradesResponse> {
    const lesson = await this.repo.findLessonWithGroup(lessonId);
    if (!lesson) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (lesson.status === 'cancelled')
      throw new AppException(HttpStatus.CONFLICT, 'LESSON_CANCELLED');

    await this.assertCanManageLesson(user, lesson);

    const { scale, kinds } = lesson.gradingConfig;

    // BR-33: Har bir bahoning turi va qiymatini tekshiramiz
    for (const item of input.grades) {
      if (!validateGradeKind(kinds, item.kind)) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'GRADE_KIND_NOT_ALLOWED');
      }
      if (!validateGradeValue(scale, item.value)) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'GRADE_SCALE_EXCEEDED');
      }
    }

    const rowsToUpsert = input.grades.map((item) => ({
      lessonId,
      studentId: item.studentId,
      kind: item.kind,
      value: item.value,
      createdBy: user.id,
    }));
    await this.repo.upsertGradesBatch(rowsToUpsert);

    if (input.comments.length > 0) {
      const commentRows = input.comments.map((c) => ({
        studentId: c.studentId,
        groupId: lesson.groupId,
        lessonId: lesson.id,
        text: c.text,
        visibility: c.visibility,
        createdBy: user.id,
      }));
      await this.repo.insertCommentsBatch(commentRows);
    }

    await this.audit.record(ctx, {
      action: 'grade.write',
      entity: 'grade',
      entityId: lessonId,
      after: {
        gradesCount: input.grades.length,
        commentsCount: input.comments.length,
      },
    });

    return this.getLessonGrades(user, lessonId);
  }

  /** O'quvchining baholar tarixi va izohlari. */
  async getStudentGradesHistory(user: RequestUser, query: StudentGradesQueryInput) {
    await this.studentScope.assertVisible(user, query.studentId);
    const isStaff = user.role !== 'guardian';

    const gradesHistory = await this.repo.findStudentGrades(
      query.studentId,
      query.groupId,
      query.from,
      query.to,
    );
    const commentsHistory = await this.repo.findStudentComments(query.studentId, isStaff);

    return {
      studentId: query.studentId,
      grades: gradesHistory,
      comments: commentsHistory,
    };
  }

  private async assertCanViewLesson(
    user: RequestUser,
    lesson: { groupId: string; teacherId: string | null },
  ): Promise<void> {
    if (lesson.teacherId === user.id) return;
    await this.groupScope.assertVisible(user, lesson.groupId);
  }

  private async assertCanManageLesson(
    user: RequestUser,
    lesson: { groupId: string; teacherId: string | null },
  ): Promise<void> {
    if (lesson.teacherId === user.id) return;
    await this.groupScope.assertVisible(user, lesson.groupId);
  }

  private serializeGrade(g: EnrichedGradeRow): GradeRecord {
    return {
      id: g.id,
      lessonId: g.lessonId,
      studentId: g.studentId,
      studentName: g.studentName,
      studentCode: `LG-${g.studentCode}`,
      kind: g.kind as GradedKind,
      value: g.value,
      createdBy: g.createdBy,
      createdByName: g.createdByName,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  }

  private serializeComment(c: EnrichedCommentRow): TeacherComment {
    return {
      id: c.id,
      studentId: c.studentId,
      studentName: c.studentName,
      groupId: c.groupId,
      groupName: c.groupName,
      lessonId: c.lessonId,
      text: c.text,
      visibility: c.visibility as TeacherCommentVisibility,
      createdBy: c.createdBy,
      createdByName: c.createdByName,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
