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
export type GroupAttendance = z.infer<typeof GroupAttendanceSchema>;
