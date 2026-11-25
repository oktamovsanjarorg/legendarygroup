import type { DayAttendance, GroupAttendance, UnmarkedLessonsResponse } from '@lg/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { addDays } from './time.js';

const KEY = ['staff', 'attendance'] as const;

export type DayLesson = DayAttendance['lessons'][number];
export type LessonMarkState = 'cancelled' | 'noStudents' | 'marked' | 'notStarted' | 'unmarked';

/** Kun darsining holati: davomat qilinganmi (FR-ATT-5). */
export function markState(l: DayLesson, startsAt: Date, now: Date): LessonMarkState {
  if (l.cancelled) return 'cancelled';
  if (l.marked > 0) return 'marked';
  if (l.expected === 0) return 'noStudents';
  return now < startsAt ? 'notStarted' : 'unmarked';
}

export interface GroupMonthRow {
  id: string;
  name: string;
  came: number;
  total: number;
}

/** Oy jadvali → o'quvchi bo'yicha (kelgan / belgilangan darslar). */
export function perStudent(g: GroupAttendance): GroupMonthRow[] {
  const live = new Set(g.lessons.filter((l) => !l.cancelled).map((l) => l.id));
  return g.students.map((s) => {
    const marks = g.marks.filter((m) => m.studentId === s.id && live.has(m.lessonId));
    const came = marks.filter((m) => m.status === 'present' || m.status === 'late').length;
    return { id: s.id, name: s.name, came, total: marks.length };
  });
}

/** Oy jadvali → dars bo'yicha (kelgan / belgilangan o'quvchilar). */
export function perLesson(g: GroupAttendance) {
  return g.lessons.map((l) => {
    const marks = g.marks.filter((m) => m.lessonId === l.id);
    const came = marks.filter((m) => m.status === 'present' || m.status === 'late').length;
    return { ...l, came, total: marks.length };
  });
}

export function useDayAttendance(date: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'day', date],
    queryFn: () => api.request<DayAttendance>(`/attendance/day?date=${date}`),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

/** Oldingi 31 kunda belgilanmay qolganlar (bugundan oldingi). */
export function useOldUnmarked(today: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'unmarked', today],
    queryFn: async () => {
      const r = await api.request<UnmarkedLessonsResponse>('/attendance/unmarked');
      return r.items.filter((i) => i.date < today);
    },
  });
}

export function useGroupMonth(groupId: string, period: string) {
  const api = useApi();
  const from = `${period}-01`;
  const to = addDays(`${addDays(`${period}-28`, 4).slice(0, 7)}-01`, -1);
  return useQuery({
    queryKey: [...KEY, 'month', groupId, period],
    queryFn: () =>
      api.request<GroupAttendance>(`/attendance/groups?groupId=${groupId}&from=${from}&to=${to}`),
    placeholderData: keepPreviousData,
  });
}
