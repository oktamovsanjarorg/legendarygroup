import { z } from 'zod';

export const StudentRankingItemSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentCode: z.string(),
  rank: z.number().int().positive(),
  attendanceRatePercent: z.number().min(0).max(100),
  averageGrade: z.number().min(0).max(100),
  averageTestScorePercent: z.number().min(0).max(100),
  compositeScore: z.number().min(0).max(100),
  totalLessons: z.number().int().nonnegative(),
  attendedLessons: z.number().int().nonnegative(),
});
export type StudentRankingItem = z.infer<typeof StudentRankingItemSchema>;

export const GroupLeaderboardResponseSchema = z.object({
  groupId: z.string().uuid(),
  groupName: z.string(),
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
  students: z.array(StudentRankingItemSchema),
});
export type GroupLeaderboardResponse = z.infer<typeof GroupLeaderboardResponseSchema>;

export const AttendanceProgressPointSchema = z.object({
  lessonId: z.string().uuid(),
  date: z.string(),
  status: z.string(),
  lateMinutes: z.number().nullable(),
});
export type AttendanceProgressPoint = z.infer<typeof AttendanceProgressPointSchema>;

export const GradeProgressPointSchema = z.object({
  lessonId: z.string().uuid(),
  date: z.string(),
  kind: z.string(),
  value: z.number(),
});
export type GradeProgressPoint = z.infer<typeof GradeProgressPointSchema>;

export const TestProgressPointSchema = z.object({
  testId: z.string().uuid(),
  title: z.string(),
  date: z.string(),
  score: z.number(),
  maxScore: z.number(),
  percent: z.number(),
});
export type TestProgressPoint = z.infer<typeof TestProgressPointSchema>;

export const StudentProgressResponseSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  groupId: z.string().uuid(),
  groupName: z.string(),
  rank: z.number().int().positive().nullable(),
  totalStudents: z.number().int().positive().nullable(),
  averageGrade: z.number().min(0).max(100),
  attendanceRatePercent: z.number().min(0).max(100),
  averageTestScorePercent: z.number().min(0).max(100),
  compositeScore: z.number().min(0).max(100),
  attendanceTrend: z.array(AttendanceProgressPointSchema),
  gradesTrend: z.array(GradeProgressPointSchema),
  testResults: z.array(TestProgressPointSchema),
});
export type StudentProgressResponse = z.infer<typeof StudentProgressResponseSchema>;
