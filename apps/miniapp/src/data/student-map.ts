import { formatMonth } from '@lg/i18n';
import type { AttendanceMark } from '@lg/ui-tg';
import type { StudentProfile } from '../screens/teacher/student.js';
import { addDays, atTashkent } from './time.js';

/** `GET /attendance/history` qatori (03: tipsiz javob — kerakli maydonlar). */
export interface AttendanceHistoryRow {
  lessonId: string;
  date: string;
  groupName: string;
  status: AttendanceMark['kind'];
}

/** `GET /grades/history` javobi. */
export interface GradesHistory {
  grades: {
    id: string;
    lessonId: string;
    date: string;
    kind: 'homework' | 'activity';
    value: number;
  }[];
  comments: {
    id: string;
    text: string;
    visibility: 'guardian' | 'internal';
    groupName: string;
    createdAt: string;
  }[];
}

export const monthStart = (today: string): string => `${today.slice(0, 8)}01`;

/** Oy kalendari: dushanbadan boshlanadigan siljish, kunlar soni, kun → belgi. */
export function monthCalendar(
  today: string,
  rows: readonly AttendanceHistoryRow[],
): StudentProfile['month'] {
  const first = monthStart(today);
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const nextMonth = addDays(`${today.slice(0, 8)}28`, 4);
  const daysInMonth = Number(addDays(monthStart(nextMonth), -1).slice(8, 10));
  return {
    title: formatMonth(atTashkent(today, '12:00')),
    offset: (weekday + 6) % 7,
    daysInMonth,
    marks: Object.fromEntries(
      rows
        .filter((r) => r.date.startsWith(today.slice(0, 7)))
        .map((r) => [Number(r.date.slice(8, 10)), r.status]),
    ),
  };
}

/** BR-37: dars kuni + 3 kun, oxirgi kun 23:59 gacha (Toshkent). */
export const editDeadline = (lessonDate: string): Date =>
  atTashkent(addDays(lessonDate, 3), '23:59');

export function studentProfile(input: {
  name: string;
  groupName: string;
  today: string;
  attendance: readonly AttendanceHistoryRow[];
  history: GradesHistory;
}): StudentProfile {
  const inGroup = input.attendance.filter((r) => r.groupName === input.groupName);
  const last = inGroup[0]?.date ?? input.today;
  return {
    name: input.name,
    groupName: input.groupName,
    month: monthCalendar(input.today, inGroup),
    grades: input.history.grades.map((g) => ({
      id: g.id,
      date: atTashkent(g.date, '12:00'),
      kind: g.kind,
      value: String(g.value),
    })),
    comments: input.history.comments
      .filter((c) => c.groupName === input.groupName)
      .map((c) => ({
        id: c.id,
        date: new Date(c.createdAt),
        text: c.text,
        visibility: c.visibility === 'guardian' ? 'parent' : 'internal',
      })),
    editableUntil: editDeadline(last),
  };
}
