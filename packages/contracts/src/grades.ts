import { z } from 'zod';
import { GRADED_KINDS } from './groups.js';

export const TEACHER_COMMENT_VISIBILITIES = ['guardian', 'internal'] as const;
export type TeacherCommentVisibility = (typeof TEACHER_COMMENT_VISIBILITIES)[number];

export const GradeItemSchema = z.object({
  studentId: z.string().uuid(),
  kind: z.enum(GRADED_KINDS),
  value: z.number().int().min(0).max(100),
});
export type GradeItemInput = z.infer<typeof GradeItemSchema>;

export const LessonCommentItemSchema = z.object({
  studentId: z.string().uuid(),
  text: z.string().trim().min(1).max(1000),
  visibility: z.enum(TEACHER_COMMENT_VISIBILITIES).default('guardian'),
});
export type LessonCommentItemInput = z.infer<typeof LessonCommentItemSchema>;

export const SetLessonGradesRequest = z.object({
  grades: z.array(GradeItemSchema),
  comments: z.array(LessonCommentItemSchema).default([]),
});
export type SetLessonGradesInput = z.infer<typeof SetLessonGradesRequest>;

export const GradeRecordSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  studentCode: z.string().optional(),
  kind: z.enum(GRADED_KINDS),
  value: z.number(),
  createdBy: z.string().uuid(),
  createdByName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GradeRecord = z.infer<typeof GradeRecordSchema>;

export const TeacherCommentSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  groupId: z.string().uuid(),
  groupName: z.string().optional(),
  lessonId: z.string().uuid().nullable(),
  lessonDate: z.string().optional(),
  text: z.string(),
  visibility: z.enum(TEACHER_COMMENT_VISIBILITIES),
  createdBy: z.string().uuid(),
  createdByName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TeacherComment = z.infer<typeof TeacherCommentSchema>;

export const LessonGradesResponseSchema = z.object({
  lessonId: z.string().uuid(),
  groupId: z.string().uuid(),
  groupName: z.string(),
  date: z.string(),
  scale: z.string(),
  allowedKinds: z.array(z.string()),
  grades: z.array(GradeRecordSchema),
  comments: z.array(TeacherCommentSchema),
});
export type LessonGradesResponse = z.infer<typeof LessonGradesResponseSchema>;

export const StudentGradesQuery = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type StudentGradesQueryInput = z.infer<typeof StudentGradesQuery>;
