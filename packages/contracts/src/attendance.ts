import { z } from 'zod';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const AttendanceItemSchema = z
  .object({
    studentId: z.string().uuid(),
    status: z.enum(ATTENDANCE_STATUSES),
    lateMinutes: z.number().int().min(1).max(300).optional().nullable(),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .refine(
    (data) =>
      data.status === 'late' ? typeof data.lateMinutes === 'number' && data.lateMinutes > 0 : true,
    { message: 'LATE_MINUTES_REQUIRED', path: ['lateMinutes'] },
  );
export type AttendanceItemInput = z.infer<typeof AttendanceItemSchema>;

export const MarkAttendanceRequest = z.object({
  clientMutationId: z.string().max(100).optional(),
  changeReason: z.string().trim().min(3).max(500).optional(),
  items: z.array(AttendanceItemSchema).min(1),
});
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceRequest>;

export const AttendanceRecordSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  studentCode: z.string().optional(),
  status: z.enum(ATTENDANCE_STATUSES),
  lateMinutes: z.number().nullable(),
  note: z.string().nullable(),
  markedBy: z.string().uuid(),
  markedByName: z.string().optional(),
  markedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

export const LessonAttendanceSchema = z.object({
  lessonId: z.string().uuid(),
  groupId: z.string().uuid(),
  groupName: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  teacherId: z.string().uuid(),
  teacherName: z.string(),
  canEdit: z.boolean(),
  records: z.array(AttendanceRecordSchema),
  expectedStudents: z.array(
    z.object({
      id: z.string().uuid(),
      fullName: z.string(),
      code: z.string(),
      advanceAbsenceReason: z.string().optional().nullable(),
    }),
  ),
});
export type LessonAttendance = z.infer<typeof LessonAttendanceSchema>;

export const GroupAttendanceQuery = z.object({
  groupId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type GroupAttendanceQueryInput = z.infer<typeof GroupAttendanceQuery>;

export const StudentAttendanceHistoryQuery = z.object({
  studentId: z.string().uuid(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type StudentAttendanceHistoryQueryInput = z.infer<typeof StudentAttendanceHistoryQuery>;
