import type {
  GroupLeaderboardResponse,
  GroupListItem,
  GroupStudentCounts,
  LessonAttendance,
  LessonDto,
  RosterResult,
} from '@lg/contracts';
import type { StripDay } from '@lg/ui-tg';
import { useQuery } from '@tanstack/react-query';
import { useApi, useClock } from './deps.js';
import {
  activeLessons,
  groupStudents,
  scheduleLessons,
  teacherGroups,
  todayLessons,
} from './teacher-map.js';
import { atTashkent, weekDates } from './time.js';

/** Ustoz ekranlari (T-114). Scope serverda: faqat o'z guruhlari va darslari (02 §3). */
const lessonsPath = (from: string, to: string) => `/lessons?from=${from}&to=${to}`;

export function useTeacherToday() {
  const api = useApi();
  const clock = useClock();
  const today = clock.today();
  return useQuery({
    queryKey: ['teacher', 'today', today],
    queryFn: async () => {
      const [lessons, groups] = await Promise.all([
        api.request<LessonDto[]>(lessonsPath(today, today)),
        api.request<GroupListItem[]>('/groups'),
      ]);
      const now = clock.now();
      // Boshlangan darslar uchun davomat holati (kunda bir necha dars — alohida so'rov yetarli).
      const started = activeLessons(lessons).filter((l) => atTashkent(l.date, l.startTime) <= now);
      const marks = await Promise.all(
        started.map(async (l) => {
          const att = await api
            .request<LessonAttendance>(`/attendance/lessons/${l.id}`)
            .catch(() => undefined);
          return [l.id, att] as const;
        }),
      );
      const attendance = new Map(
        marks.filter((m): m is readonly [string, LessonAttendance] => m[1] !== undefined),
      );
      return todayLessons(lessons, groups, attendance, now);
    },
  });
}

export function useTeacherGroups(meId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['teacher', 'groups'],
    queryFn: async () => {
      const [groups, counts] = await Promise.all([
        api.request<GroupListItem[]>('/groups'),
        api.request<GroupStudentCounts>('/groups/student-counts'),
      ]);
      return teacherGroups(groups, counts.counts, meId);
    },
  });
}

/** Haftalik jadval: tanlangan sana haftasi bir so'rovda, kun bo'yicha ajratiladi. */
export function useTeacherWeek(selected: string) {
  const api = useApi();
  const week = weekDates(selected);
  const from = week[0] ?? selected;
  const to = week[6] ?? selected;
  return useQuery({
    queryKey: ['teacher', 'week', from],
    queryFn: async () => {
      const [lessons, groups] = await Promise.all([
        api.request<LessonDto[]>(lessonsPath(from, to)),
        api.request<GroupListItem[]>('/groups'),
      ]);
      const active = activeLessons(lessons);
      const days: StripDay[] = week.map((date) => ({
        date,
        day: Number(date.slice(8, 10)),
        busy: active.some((l) => l.date === date),
      }));
      const byDay = (date: string) =>
        scheduleLessons(
          active.filter((l) => l.date === date),
          groups,
        );
      return { days, byDay };
    },
  });
}

/** MT-05 guruh: ro'yxat (bugun yozilganlar, BR-32) + davomat foizi (reyting hisobidan). */
export function useTeacherGroup(groupId: string, meId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['teacher', 'group', groupId],
    queryFn: async () => {
      const [groups, counts, roster, board] = await Promise.all([
        api.request<GroupListItem[]>('/groups'),
        api.request<GroupStudentCounts>('/groups/student-counts'),
        api.request<RosterResult>(`/groups/${groupId}/students`),
        api.request<GroupLeaderboardResponse>(`/grades/groups/${groupId}/leaderboard`),
      ]);
      const group = teacherGroups(groups, counts.counts, meId).find((g) => g.id === groupId);
      return group ? { group, students: groupStudents(roster, board) } : null;
    },
  });
}
