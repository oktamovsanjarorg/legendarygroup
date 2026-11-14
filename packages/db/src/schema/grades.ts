import { GRADED_KINDS, TEACHER_COMMENT_VISIBILITIES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { groups } from './groups.js';
import { lessons } from './lessons.js';
import { students } from './students.js';
import { users } from './users.js';

export const grades = pgTable(
  'grades',
  {
    id: primaryUuid(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: GRADED_KINDS }).notNull(),
    value: integer('value').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('grades_lesson_student_kind_idx').on(t.lessonId, t.studentId, t.kind),
    index('grades_lesson_idx').on(t.lessonId),
    index('grades_student_idx').on(t.studentId),
    check('grades_kind_check', oneOf(t.kind, GRADED_KINDS)),
    check('grades_value_check', sql`${t.value} >= 0 AND ${t.value} <= 100`),
  ],
);

export const teacherComments = pgTable(
  'teacher_comments',
  {
    id: primaryUuid(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    text: text('text').notNull(),
    visibility: text('visibility', { enum: TEACHER_COMMENT_VISIBILITIES })
      .notNull()
      .default('guardian'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('teacher_comments_student_idx').on(t.studentId),
    index('teacher_comments_group_idx').on(t.groupId),
    index('teacher_comments_lesson_idx').on(t.lessonId),
    check('teacher_comments_visibility_check', oneOf(t.visibility, TEACHER_COMMENT_VISIBILITIES)),
  ],
);

export type GradeRow = typeof grades.$inferSelect;
export type NewGradeRow = typeof grades.$inferInsert;
export type TeacherCommentRow = typeof teacherComments.$inferSelect;
export type NewTeacherCommentRow = typeof teacherComments.$inferInsert;
