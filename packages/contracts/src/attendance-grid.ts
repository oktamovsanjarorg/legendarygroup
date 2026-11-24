import { z } from 'zod';
import { ATTENDANCE_STATUSES } from './attendance.js';

/** W-12 (T-112, FR-ATT-4/5): guruh × dars sanalari jadvali. */
export const GroupAttendanceSchema = z.object({
  groupId: z.string().uuid(),
  lessons: z.array(
    z.object({
      id: z.string().uuid(),
      date: z.string(),
      startTime: z.string(),
      cancelled: z.boolean(),
    }),
  ),
  /** Oraliqda guruhda bo'lgan o'quvchilar (BR-32). */
  students: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  marks: z.array(
    z.object({
      lessonId: z.string().uuid(),
      studentId: z.string().uuid(),
      status: z.enum(ATTENDANCE_STATUSES),
    }),
  ),
});
/** MS-13 (T-137, FR-ATT-5): kunning darslari va kelmaganlar. */
export const DayAttendanceQuery = z.object({ date: z.iso.date() });
export const DayAttendanceLesson = z.object({
  lessonId: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  teacherName: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  cancelled: z.boolean(),
  /** Shu kuni guruhda bo'lishi kerak bo'lganlar (BR-32). */
  expected: z.number().int(),
  marked: z.number().int(),
  /** Keldi (kech qolgan ham). */
  came: z.number().int(),
});
export const DayAbsentee = z.object({
  lessonId: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  groupName: z.string(),
  status: z.enum(['absent', 'late', 'excused']),
  lateMinutes: z.number().int().nullable(),
});
export const DayAttendanceSchema = z.object({
  date: z.string(),
  lessons: z.array(DayAttendanceLesson),
  absentees: z.array(DayAbsentee),
});
export type DayAttendance = z.infer<typeof DayAttendanceSchema>;
export type DayAttendanceLesson = z.infer<typeof DayAttendanceLesson>;
export type DayAbsentee = z.infer<typeof DayAbsentee>;
export type GroupAttendance = z.infer<typeof GroupAttendanceSchema>;
