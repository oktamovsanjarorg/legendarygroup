import type { AttendanceItemInput, AttendanceRecord, LessonAttendance } from '@lg/contracts';
import type { AttendanceMark } from '@lg/ui-tg';
import type { Marks, RosterStudent } from '../screens/teacher/attendance-marks.js';

/** Ota-onaga xabar ketguncha tuzatish oynasi (BR-31). */
export const QUIET_MS = 3 * 60_000;

export const roster = (a: LessonAttendance): RosterStudent[] =>
  a.expectedStudents.map((s) => ({
    id: s.id,
    name: s.fullName,
    preExcused: Boolean(s.advanceAbsenceReason),
  }));

const toMark = (r: AttendanceRecord): AttendanceMark =>
  r.status === 'late' ? { kind: 'late', minutes: r.lateMinutes ?? 1 } : { kind: r.status };

/** Saqlangan davomat (yo'q bo'lsa — `undefined`: ekran boshlang'ich belgilarni qo'yadi). */
export function savedMarks(a: LessonAttendance): Marks | undefined {
  if (a.records.length === 0) return undefined;
  return Object.fromEntries(a.records.map((r) => [r.studentId, toMark(r)]));
}

export const toItems = (marks: Marks): AttendanceItemInput[] =>
  Object.entries(marks).map(([studentId, m]) =>
    m.kind === 'late'
      ? { studentId, status: 'late', lateMinutes: m.minutes }
      : { studentId, status: m.kind },
  );
