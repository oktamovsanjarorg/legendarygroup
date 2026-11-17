import type {
  LessonDto,
  StudentDetail,
  StudentListRow,
  StudentProgressResponse,
  TestResultItem,
} from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { type AttendanceRow, childToday } from './guardian-map.js';
import { useApi, useClock } from './deps.js';
import { addDays, atTashkent, weekDates } from './time.js';
import type { StripDay } from '@lg/ui-tg';
import type { ChildToday } from '../screens/guardian/home.js';
import type { ScheduleLesson } from '../screens/teacher/schedule.js';

/** Joriy oʻquvchi (server scope — faqat oʻzi). */
export function useCurrentStudent() {
  const api = useApi();
  return useQuery({
    queryKey: ['student', 'me'],
    queryFn: async () => {
      const res = await api.request<{ items: StudentListRow[] }>('/students?limit=1');
      return res.items[0] ?? null;
    },
  });
}

/** Oʻquvchining toʻliq kartochkasi. */
export function useStudentDetail(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ['student', 'detail', id],
    enabled: Boolean(id),
    queryFn: () => api.request<StudentDetail>(`/students/${id}`),
  });
}

export interface StudentTodayData {
  todayStatus: ChildToday;
  todayLessons: LessonDto[];
  nextLesson?: LessonDto;
}

/** Bugungi darslar va davomat (M-STU-01). */
export function useStudentToday(id: string | undefined) {
  const api = useApi();
  const clock = useClock();
  const today = clock.today();

  return useQuery({
    queryKey: ['student', 'today', id, today],
    enabled: Boolean(id),
    queryFn: async (): Promise<StudentTodayData> => {
      const [lessons, attendance] = await Promise.all([
        api.request<LessonDto[]>(`/students/${id}/lessons?from=${today}&to=${addDays(today, 14)}`),
        api.request<AttendanceRow[]>(
          `/attendance/history?studentId=${id}&from=${today}&to=${today}`,
        ),
      ]);

      const todayLessons = lessons.filter((l) => l.date === today);
      const todayStatus = childToday(today, lessons, attendance);

      const futureLessons = lessons.filter((l) => l.date > today);
      const nextLesson = todayLessons.length > 0 ? todayLessons[0] : futureLessons[0];

      return { todayStatus, todayLessons, nextLesson };
    },
  });
}

/** Haftalik dars jadvali (M-STU-02). */
export function useStudentSchedule(id: string | undefined, selectedDate: string) {
  const api = useApi();
  const clock = useClock();
  const days = weekDates(selectedDate);
  const from = days[0] ?? selectedDate;
  const to = days[days.length - 1] ?? selectedDate;

  return useQuery({
    queryKey: ['student', 'schedule', id, from, to],
    enabled: Boolean(id),
    queryFn: async () => {
      const lessons = await api.request<LessonDto[]>(
        `/students/${id}/lessons?from=${from}&to=${to}`,
      );

      const stripDays: StripDay[] = days.map((d) => {
        const dateObj = new Date(`${d}T12:00:00Z`);
        const dayLessons = lessons.filter((l) => l.date === d);
        return {
          date: d,
          weekday: dateObj.toLocaleDateString('uz-UZ', { weekday: 'short' }),
          day: dateObj.getUTCDate(),
          isToday: d === clock.today(),
          hasLessons: dayLessons.length > 0,
        };
      });

      const scheduleLessons: ScheduleLesson[] = lessons.map((l) => ({
        id: l.id,
        groupId: l.group.id,
        groupName: l.group.name,
        courseName: '',
        room: l.room?.name ?? '',
        startsAt: atTashkent(l.date, l.startTime),
        endsAt: atTashkent(l.date, l.endTime),
      }));

      const byDay = (date: string) =>
        scheduleLessons.filter((l) => l.startsAt.toISOString().slice(0, 10) === date);

      return { days: stripDays, lessons: scheduleLessons, byDay };
    },
  });
}

/** Test natijalari va progress (M-STU-03). */
export function useStudentResults(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ['student', 'results', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [tests, progress] = await Promise.all([
        api.request<TestResultItem[]>(`/tests/student/${id}`).catch(() => []),
        api.request<StudentProgressResponse>(`/grades/students/${id}/progress`).catch(() => null),
      ]);
      return { tests, progress };
    },
  });
}
