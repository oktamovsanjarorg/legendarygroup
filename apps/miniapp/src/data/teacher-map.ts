import type {
  GroupLeaderboardResponse,
  GroupListItem,
  LessonAttendance,
  LessonDto,
  RosterResult,
} from '@lg/contracts';
import type { GroupStudent } from '../screens/teacher/group.js';
import type { TeacherGroup } from '../screens/teacher/groups.js';
import type { LessonInfo } from '../screens/teacher/lesson-header.js';
import type { ScheduleLesson } from '../screens/teacher/schedule.js';
import type { LessonState, TodayLesson } from '../screens/teacher/today.js';
import { atTashkent } from './time.js';

/** Guruh → kurs nomi (dars javobida kurs yo'q). */
export const courseNames = (groups: readonly GroupListItem[]): ReadonlyMap<string, string> =>
  new Map(groups.map((g) => [g.id, g.course.name]));

export function lessonInfo(l: LessonDto, courses: ReadonlyMap<string, string>): LessonInfo {
  return {
    id: l.id,
    groupName: l.group.name,
    courseName: courses.get(l.group.id) ?? '',
    startsAt: atTashkent(l.date, l.startTime),
    endsAt: atTashkent(l.date, l.endTime),
    room: l.room?.name ?? '',
    substitute: l.isSubstitute,
  };
}

/** Bekor qilingan dars ro'yxatda ko'rinmaydi (ustozga ish yo'q). */
export const activeLessons = (lessons: readonly LessonDto[]): LessonDto[] =>
  lessons
    .filter((l) => l.status !== 'cancelled')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

/** Davomat bo'yicha "keldi" (kech qolgan ham — FR-ATT-2) va jami. */
export function attendanceCount(a: LessonAttendance): { present: number; total: number } {
  const present = a.records.filter((r) => r.status === 'present' || r.status === 'late').length;
  return { present, total: a.expectedStudents.length };
}

/**
 * Bugungi dars holati: belgilangan bo'lsa — son; boshlanmagan — "kutilmoqda"; davom etmoqda —
 * "hozir"; tugagan, belgilanmagan — "belgilanmagan" (FR-ATT-5).
 */
export function lessonState(info: LessonInfo, now: Date, att?: LessonAttendance): LessonState {
  if (att && att.records.length > 0) return { kind: 'marked', ...attendanceCount(att) };
  if (now < info.startsAt) return { kind: 'upcoming' };
  if (now < info.endsAt) return { kind: 'now' };
  return { kind: 'unmarked' };
}

export function todayLessons(
  lessons: readonly LessonDto[],
  groups: readonly GroupListItem[],
  attendance: ReadonlyMap<string, LessonAttendance>,
  now: Date,
): TodayLesson[] {
  const courses = courseNames(groups);
  return activeLessons(lessons).map((l) => {
    const info = lessonInfo(l, courses);
    return { ...info, state: lessonState(info, now, attendance.get(l.id)) };
  });
}

export const scheduleLessons = (
  lessons: readonly LessonDto[],
  groups: readonly GroupListItem[],
): ScheduleLesson[] => {
  const courses = courseNames(groups);
  return activeLessons(lessons).map((l) => lessonInfo(l, courses));
};

export const teacherGroups = (
  groups: readonly GroupListItem[],
  counts: Readonly<Record<string, number>>,
  meId: string,
): TeacherGroup[] =>
  groups.map((g) => ({
    id: g.id,
    name: g.name,
    courseName: g.course.name,
    studentCount: counts[g.id] ?? 0,
    role: g.mainTeacher?.id === meId ? 'main' : 'assistant',
  }));

/** Faol (muzlatilmagan ham) o'quvchilar, davomat foizi reytingdan; dars bo'lmagan — 100%. */
export const groupStudents = (
  roster: RosterResult,
  board: GroupLeaderboardResponse,
): GroupStudent[] => {
  const rate = new Map(board.students.map((s) => [s.studentId, s]));
  return roster.items
    .map((r) => {
      const b = rate.get(r.studentId);
      return {
        id: r.studentId,
        name: r.fullName,
        attendanceRate: b && b.totalLessons > 0 ? Math.round(b.attendanceRatePercent) : 100,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
};
