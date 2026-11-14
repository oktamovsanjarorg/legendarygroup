import type { AttendanceRecord, AttendanceStatus } from '@lg/contracts';
import type { EnrichedAttendanceRow } from './attendance.repository.js';

export function serializeAttendanceRecord(r: EnrichedAttendanceRow): AttendanceRecord {
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
