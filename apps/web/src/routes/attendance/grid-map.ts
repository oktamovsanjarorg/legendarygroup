import type { GroupAttendance } from '@lg/contracts';
import type { AttendanceGrid, Mark } from '../../screens/f1/attendance-grid.js';

/** `2026-11-10` → `10.11` (ustun sarlavhasi). */
const short = (ymd: string) => `${ymd.slice(8, 10)}.${ymd.slice(5, 7)}`;

/**
 * API jadvali → ekran. Bekor qilingan darslar ustun bo'lmaydi; belgilanmagan ustun — o'tgan
 * (yoki bugungi) dars, kutilgan o'quvchilardan hech biri belgilanmagan (FR-ATT-5).
 */
export function toGrid(
  g: GroupAttendance,
  groups: AttendanceGrid['groups'],
  today: string,
): AttendanceGrid & { lessonIds: readonly string[]; lessonDates: readonly string[] } {
  const ls = g.lessons.filter((l) => !l.cancelled);
  const mark = new Map(g.marks.map((m) => [`${m.lessonId}:${m.studentId}`, m.status as Mark]));
  const unmarked = ls
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.date <= today && !g.marks.some((m) => m.lessonId === l.id))
    .map(({ i }) => i);
  return {
    groups,
    group: g.groupId,
    dates: ls.map((l) =>
      ls.filter((x) => x.date === l.date).length > 1
        ? `${short(l.date)} ${l.startTime}`
        : short(l.date),
    ),
    unmarked,
    rows: g.students.map((s) => ({
      id: s.id,
      name: s.name,
      marks: ls.map((l) => mark.get(`${l.id}:${s.id}`) ?? null),
    })),
    lessonIds: ls.map((l) => l.id),
    lessonDates: ls.map((l) => l.date),
  };
}
