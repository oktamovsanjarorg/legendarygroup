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
import { activeLessons, lessonInfo } from './teacher-map.js';
import { addDays, weekDates } from './time.js';
import type { StripDay } from '@lg/ui-tg';
import type { ChildToday } from '../screens/guardian/home.js';
import type { ScheduleLesson } from '../screens/teacher/schedule.js';

/** Oʻquvchida `group.view` yoʻq — kurs nomi dars kartasida koʻrsatilmaydi. */
const NO_COURSES: ReadonlyMap<string, string> = new Map();

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

/** Haftalik dars jadvali (M-STU-02): kunlar Toshkent sanasi (`l.date`) boʻyicha. */
export function useStudentSchedule(id: string | undefined, selectedDate: string) {
  const api = useApi();
  const days = weekDates(selectedDate);
  const from = days[0] ?? selectedDate;
  const to = days[days.length - 1] ?? selectedDate;

  return useQuery({
    queryKey: ['student', 'schedule', id, from],
    enabled: Boolean(id),
    queryFn: async () => {
      const lessons = activeLessons(
        await api.request<LessonDto[]>(`/students/${id}/lessons?from=${from}&to=${to}`),
      );
      const week: StripDay[] = days.map((date) => ({
        date,
        day: Number(date.slice(8, 10)),
        busy: lessons.some((l) => l.date === date),
      }));
      const byDay = (date: string): ScheduleLesson[] =>
        lessons.filter((l) => l.date === date).map((l) => lessonInfo(l, NO_COURSES));
      return { days: week, byDay };
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
      // Xato yutilmaydi — QueryView xato/ruxsat yoʻq holatini koʻrsatadi (5 holat)
      const [tests, progress] = await Promise.all([
        api.request<TestResultItem[]>(`/tests/student/${id}`),
        api.request<StudentProgressResponse>(`/grades/students/${id}/progress`),
      ]);
      return { tests, progress };
    },
  });
}
