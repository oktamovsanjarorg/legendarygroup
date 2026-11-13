import type {
  Course,
  GroupDetail,
  GroupListItem,
  GroupStudentCounts,
  Room,
  RosterResult,
  TeacherOption,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import type { GroupFormOptions } from '../../screens/f1/group-form.js';
import type { GroupsFilter } from '../../screens/f1/groups.js';

export const useGroups = (filter: GroupsFilter) =>
  useQuery({
    queryKey: ['groups', 'list', filter],
    queryFn: () => api.request<GroupListItem[]>(`/groups?status=${filter}`),
  });

export const useStudentCounts = () =>
  useQuery({
    queryKey: ['groups', 'counts'],
    queryFn: () => api.request<GroupStudentCounts>('/groups/student-counts'),
  });

export const useGroupDetail = (id: string) =>
  useQuery({
    queryKey: ['groups', 'detail', id],
    queryFn: () => api.request<GroupDetail>(`/groups/${id}`),
  });

export const useRoster = (id: string) =>
  useQuery({
    queryKey: ['groups', 'roster', id],
    queryFn: () => api.request<RosterResult>(`/groups/${id}/students`),
  });

/** Forma tanlovlari: faol kurslar, xonalar, ustozlar (faqat `group.manage` bilan so'raladi). */
export function useFormOptions(enabled: boolean) {
  const courses = useQuery({
    queryKey: ['org', 'courses', 'active'],
    queryFn: () => api.request<Course[]>('/courses?status=active'),
    enabled,
  });
  const rooms = useQuery({
    queryKey: ['org', 'rooms', 'active'],
    queryFn: () => api.request<Room[]>('/rooms?status=active'),
    enabled,
  });
  const teachers = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.request<TeacherOption[]>('/teachers'),
    enabled,
  });
  const options: GroupFormOptions = {
    courses: (courses.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    rooms: (rooms.data ?? []).map((r) => ({ value: r.id, label: r.name })),
    teachers: (teachers.data ?? []).map((x) => ({ value: x.id, label: x.fullName })),
  };
  const names = new Map([...options.rooms, ...options.teachers].map((o) => [o.value, o.label]));
  return {
    options,
    courses: courses.data ?? [],
    /** Xona yoki ustoz nomi (to'qnashuv xabari uchun). */
    nameOf: (id: string) => names.get(id),
  };
}

export type FormOptions = ReturnType<typeof useFormOptions>;

export interface GroupCall {
  path: string;
  method: 'POST' | 'PATCH' | 'PUT';
  body?: unknown;
}

/** Guruh yozish amallari (T-103): har biri ro'yxat, tafsilot va sonlarni yangilaydi. */
export function useGroupCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, ...init }: GroupCall) => api.request<unknown>(path, init),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}
