import type { GroupDetail, GroupListItem, GroupSlot, GroupTeacher } from '@lg/contracts';
import type { GroupRow, GroupTeacherRow, ScheduleSlotRow } from '@lg/db';

/** `HH:MM:SS` → `HH:MM`. */
const hhmm = (t: string) => t.slice(0, 5);

export function toSlot(s: ScheduleSlotRow): GroupSlot {
  return {
    id: s.id,
    weekday: s.weekday,
    startTime: hhmm(s.startTime),
    endTime: hhmm(s.endTime),
    validFrom: s.validFrom,
    validTo: s.validTo,
  };
}

export const activeOn = (day: string) => (x: { from: string; to: string | null }) =>
  x.from <= day && (x.to === null || x.to >= day);

export interface GroupBundle {
  group: GroupRow;
  course: { id: string; name: string };
  room: { id: string; name: string } | null;
  teachers: GroupTeacherRow[];
  slots: ScheduleSlotRow[];
  names: Map<string, string>;
}

function toTeacher(t: GroupTeacherRow, names: Map<string, string>): GroupTeacher {
  return {
    id: t.id,
    teacherId: t.teacherId,
    fullName: names.get(t.teacherId) ?? '—',
    role: t.role,
    from: t.fromDate,
    to: t.toDate,
  };
}

export function toListItem(b: GroupBundle, today: string): GroupListItem {
  const g = b.group;
  const main = b.teachers
    .map((t) => toTeacher(t, b.names))
    .find((t) => t.role === 'main' && activeOn(today)(t));
  return {
    id: g.id,
    name: g.name,
    status: g.status,
    course: b.course,
    room: b.room,
    monthlyPrice: g.monthlyPrice.toString(),
    maxStudents: g.maxStudents,
    startDate: g.startDate,
    endDate: g.endDate,
    mainTeacher: main ? { id: main.teacherId, fullName: main.fullName } : null,
    slots: b.slots.map(toSlot).filter((s) => activeOn(today)({ from: s.validFrom, to: s.validTo })),
  };
}

export function toDetail(b: GroupBundle, today: string): GroupDetail {
  return {
    ...toListItem(b, today),
    gradingConfig: b.group.gradingConfig,
    teachers: b.teachers.map((t) => toTeacher(t, b.names)),
    schedule: b.slots.map(toSlot),
    createdAt: b.group.createdAt.toISOString(),
    updatedAt: b.group.updatedAt.toISOString(),
  };
}

export const GROUP_AUDIT_FIELDS = [
  'name',
  'roomId',
  'monthlyPrice',
  'maxStudents',
  'startDate',
  'endDate',
  'status',
  'gradingConfig',
] as const;
