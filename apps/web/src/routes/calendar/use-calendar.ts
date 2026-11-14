import type { GroupListItem, HolidayDto, LessonDto, Room, TeacherOption } from '@lg/contracts';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export interface LessonFilter {
  from: string;
  to: string;
  groupId: string;
  teacherId: string;
}

const query = (f: LessonFilter) => {
  const q = new URLSearchParams({ from: f.from, to: f.to });
  if (f.groupId) q.set('groupId', f.groupId);
  if (f.teacherId) q.set('teacherId', f.teacherId);
  return q.toString();
};

export const useLessons = (f: LessonFilter) =>
  useQuery({
    queryKey: ['lessons', f],
    queryFn: () => api.request<LessonDto[]>(`/lessons?${query(f)}`),
    placeholderData: (prev) => prev,
  });

/** Oraliqdagi bayramlar (yil chegarasidan o'tsa — ikki yil). */
export function useHolidays(from: string, to: string): Map<string, string> {
  const years = [...new Set([from.slice(0, 4), to.slice(0, 4)])];
  const results = useQueries({
    queries: years.map((year) => ({
      queryKey: ['holidays', year],
      queryFn: () => api.request<HolidayDto[]>(`/holidays?year=${year}`),
    })),
  });
  return new Map(results.flatMap((r) => r.data ?? []).map((h) => [h.date, h.name]));
}

export const useYearHolidays = (year: string) =>
  useQuery({
    queryKey: ['holidays', year],
    queryFn: () => api.request<HolidayDto[]>(`/holidays?year=${year}`),
  });

type Option = { value: string; label: string };

/** Filtr va forma tanlovlari. Xonalar — faqat `course.manage` bilan (aks holda tanlov yashirin). */
export function useCalendarOptions(withRooms: boolean) {
  const groups = useQuery({
    queryKey: ['groups', 'list', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
  });
  const teachers = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.request<TeacherOption[]>('/teachers'),
  });
  const rooms = useQuery({
    queryKey: ['org', 'rooms', 'active'],
    queryFn: () => api.request<Room[]>('/rooms?status=active'),
    enabled: withRooms,
  });
  const opt = <T>(xs: T[] | undefined, f: (x: T) => Option): Option[] => (xs ?? []).map(f);
  return {
    groups: opt(groups.data, (g) => ({ value: g.id, label: g.name })),
    teachers: opt(teachers.data, (x) => ({ value: x.id, label: x.fullName })),
    rooms: opt(rooms.data, (r) => ({ value: r.id, label: r.name })),
  };
}

export type CalendarOptions = ReturnType<typeof useCalendarOptions>;

export interface LessonCall {
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** Dars/bayram yozish amallari (T-104): kalendar va bayramlar yangilanadi. */
export function useLessonCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, ...init }: LessonCall) => api.request<unknown>(path, init),
    // Kutilmaydi: yangilangan ro'yxat formani o'chirishi mumkin (masalan, bekor qilingan dars),
    // o'chgan komponentning `mutate(..., { onSuccess })` chaqiruvi esa ishlamay qoladi.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lessons'] });
      void qc.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}
