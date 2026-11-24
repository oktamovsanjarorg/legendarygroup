import {
  type CreateGroupRequest,
  type GroupDetail,
  type GroupListItem,
  type GroupSlot,
  type GroupStudentCounts,
  type RosterResult,
  ScheduleConflictDetails,
  type SlotInput,
  type TeacherOption,
  type UpdateGroupRequest,
} from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ApiError } from '@lg/ui-core';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { ORG_KEY } from './staff-org.js';

const c = t.staffGroups;

/** MS-20 forma: sonlar matn ko'rinishida, pul — bigint. */
export interface GroupForm {
  name: string;
  courseId: string | null;
  roomId: string | null;
  price: bigint | null;
  maxStudents: string;
  startDate: string;
  endDate: string;
  teacherId: string | null;
  slots: readonly SlotInput[];
}

export const emptyGroup = (today: string): GroupForm => ({
  name: '',
  courseId: null,
  roomId: null,
  price: null,
  maxStudents: '15',
  startDate: today,
  endDate: '',
  teacherId: null,
  slots: [],
});

export const groupForm = (g: GroupDetail): GroupForm => ({
  name: g.name,
  courseId: g.course.id,
  roomId: g.room?.id ?? null,
  price: BigInt(g.monthlyPrice),
  maxStudents: String(g.maxStudents),
  startDate: g.startDate,
  endDate: g.endDate ?? '',
  teacherId: null,
  slots: [],
});

const max = (f: GroupForm) => Number(f.maxStudents);

export const groupReady = (f: GroupForm): boolean =>
  f.name.trim().length >= 2 &&
  f.courseId !== null &&
  f.price !== null &&
  Number.isInteger(max(f)) &&
  max(f) >= 1 &&
  max(f) <= 500 &&
  f.startDate !== '' &&
  (f.endDate === '' || f.endDate >= f.startDate);

export const createGroupBody = (f: GroupForm): CreateGroupRequest => ({
  name: f.name.trim(),
  courseId: f.courseId ?? '',
  roomId: f.roomId,
  monthlyPrice: String(f.price),
  maxStudents: max(f),
  startDate: f.startDate,
  endDate: f.endDate || null,
  slots: [...f.slots],
  teachers: f.teacherId ? [{ teacherId: f.teacherId, role: 'main' }] : [],
});

/** Faqat o'zgargan maydonlar (audit toza, boshlanish sanasi qulfi behuda ishlamaydi). */
export function updateGroupBody(f: GroupForm, g: GroupDetail): Record<string, unknown> | null {
  const next = {
    name: f.name.trim(),
    roomId: f.roomId,
    monthlyPrice: String(f.price),
    maxStudents: max(f),
    startDate: f.startDate,
    endDate: f.endDate || null,
  } satisfies Record<keyof Omit<UpdateGroupRequest, 'gradingConfig'>, unknown>;
  const prev: typeof next = { ...g, roomId: g.room?.id ?? null };
  const keys = Object.keys(next) as (keyof typeof next)[];
  const patch = Object.fromEntries(
    keys.filter((k) => next[k] !== prev[k]).map((k) => [k, next[k]]),
  );
  return Object.keys(patch).length > 0 ? patch : null;
}

const day = (weekday: number) => t.schedule.weekdays[weekday - 1] ?? '';

/** «Du, Ch, Ju 10:00–11:30» — bir xil vaqtdagi kunlar birga. */
export function scheduleText(
  slots: readonly Pick<GroupSlot, 'weekday' | 'startTime' | 'endTime'>[],
) {
  const byTime = new Map<string, number[]>();
  for (const s of slots) {
    const key = `${s.startTime}–${s.endTime}`;
    byTime.set(key, [...(byTime.get(key) ?? []), s.weekday]);
  }
  return [...byTime]
    .map(
      ([time, days]) =>
        `${days
          .sort((a, b) => a - b)
          .map(day)
          .join(', ')} ${time}`,
    )
    .join('; ');
}

/** 409 `SCHEDULE_CONFLICT` — qaysi guruh bilan (birinchisi). */
export function conflictText(e: unknown): string | null {
  if (!(e instanceof ApiError) || e.code !== 'SCHEDULE_CONFLICT') return null;
  const d = ScheduleConflictDetails.safeParse(e.details);
  const x = d.success ? d.data.conflicts[0] : undefined;
  if (!x) return null;
  return c.conflict
    .replace('{what}', c.conflictKind[x.kind])
    .replace('{group}', x.groupName)
    .replace('{day}', day(x.weekday))
    .replace('{start}', x.startTime)
    .replace('{end}', x.endTime);
}

export const matches = (g: GroupListItem, q: string): boolean => {
  const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'’‘`]/g, '');
  return norm([g.name, g.course.name, g.mainTeacher?.fullName ?? ''].join(' ')).includes(norm(q));
};

export function useGroup(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'group', id],
    queryFn: () => api.request<GroupDetail>(`/groups/${id}`),
  });
}

/** Guruh → bugun yozilganlar soni. */
export function useGroupCounts() {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'counts'],
    queryFn: () => api.request<GroupStudentCounts>('/groups/student-counts'),
  });
}

export function useRoster(groupId: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'roster', groupId],
    queryFn: () => api.request<RosterResult>(`/groups/${groupId}/students`),
  });
}

export function useTeachers(enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'teachers'],
    queryFn: () => api.request<TeacherOption[]>('/teachers'),
    enabled,
  });
}
