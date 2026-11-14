import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  grades,
  type GradeRow,
  groups,
  lessons,
  type NewGradeRow,
  type NewTeacherCommentRow,
  students,
  teacherComments,
  type TeacherCommentRow,
  users,
} from '@lg/db';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

export interface EnrichedGradeRow extends GradeRow {
  studentName: string;
  studentCode: number;
  createdByName: string;
}

export interface EnrichedCommentRow extends TeacherCommentRow {
  studentName: string;
  groupName: string;
  createdByName: string;
  lessonDate?: string;
}

@Injectable()
export class GradesRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async findLessonWithGroup(lessonId: string) {
    const [row] = await this.db
      .select({
        id: lessons.id,
        groupId: lessons.groupId,
        groupName: groups.name,
        date: lessons.date,
        teacherId: lessons.teacherId,
        status: lessons.status,
        gradingConfig: groups.gradingConfig,
      })
      .from(lessons)
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .where(eq(lessons.id, lessonId));
    return row ?? null;
  }

  async findGradesForLesson(lessonId: string): Promise<EnrichedGradeRow[]> {
    const rows = await this.db
      .select({
        record: grades,
        studentName: students.fullName,
        studentCode: students.code,
        createdByName: users.fullName,
      })
      .from(grades)
      .innerJoin(students, eq(students.id, grades.studentId))
      .innerJoin(users, eq(users.id, grades.createdBy))
      .where(eq(grades.lessonId, lessonId))
      .orderBy(students.fullName);

    return rows.map((r) => ({
      ...r.record,
      studentName: r.studentName,
      studentCode: Number(r.studentCode),
      createdByName: r.createdByName,
    }));
  }

  async findCommentsForLesson(lessonId: string): Promise<EnrichedCommentRow[]> {
    const rows = await this.db
      .select({
        record: teacherComments,
        studentName: students.fullName,
        groupName: groups.name,
        createdByName: users.fullName,
      })
      .from(teacherComments)
      .innerJoin(students, eq(students.id, teacherComments.studentId))
      .innerJoin(groups, eq(groups.id, teacherComments.groupId))
      .innerJoin(users, eq(users.id, teacherComments.createdBy))
      .where(eq(teacherComments.lessonId, lessonId))
      .orderBy(desc(teacherComments.createdAt));

    return rows.map((r) => ({
      ...r.record,
      studentName: r.studentName,
      groupName: r.groupName,
      createdByName: r.createdByName,
    }));
  }

  async upsertGradesBatch(records: NewGradeRow[]): Promise<void> {
    if (records.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (const rec of records) {
        await tx
          .insert(grades)
          .values(rec)
          .onConflictDoUpdate({
            target: [grades.lessonId, grades.studentId, grades.kind],
            set: {
              value: rec.value,
              createdBy: rec.createdBy,
              updatedAt: this.clock.now(),
            },
          });
      }
    });
  }

  async insertCommentsBatch(records: NewTeacherCommentRow[]): Promise<void> {
    if (records.length === 0) return;
    await this.db.insert(teacherComments).values(records);
  }

  async findStudentGrades(studentId: string, groupId?: string, from?: string, to?: string) {
    const conds = [eq(grades.studentId, studentId)];
    if (groupId) conds.push(eq(lessons.groupId, groupId));
    if (from) conds.push(gte(lessons.date, from));
    if (to) conds.push(lte(lessons.date, to));

    return this.db
      .select({
        id: grades.id,
        lessonId: grades.lessonId,
        date: lessons.date,
        groupName: groups.name,
        kind: grades.kind,
        value: grades.value,
        createdAt: grades.createdAt,
      })
      .from(grades)
      .innerJoin(lessons, eq(lessons.id, grades.lessonId))
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .where(and(...conds))
      .orderBy(desc(lessons.date));
  }

  async findStudentComments(studentId: string, isStaff: boolean) {
    const conds = [eq(teacherComments.studentId, studentId)];
    if (!isStaff) {
      conds.push(eq(teacherComments.visibility, 'guardian'));
    }

    return this.db
      .select({
        id: teacherComments.id,
        text: teacherComments.text,
        visibility: teacherComments.visibility,
        groupName: groups.name,
        createdAt: teacherComments.createdAt,
        createdByName: users.fullName,
      })
      .from(teacherComments)
      .innerJoin(groups, eq(groups.id, teacherComments.groupId))
      .innerJoin(users, eq(users.id, teacherComments.createdBy))
      .where(and(...conds))
      .orderBy(desc(teacherComments.createdAt));
  }
}
