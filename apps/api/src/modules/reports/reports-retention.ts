import {
  attendance,
  type Database,
  enrollments,
  grades,
  groupTeachers,
  groups,
  lessons,
  users,
} from '@lg/db';
import { calculateAttendanceRateBp, calculateRetentionRateBp } from '@lg/domain';
import { and, eq, sql } from 'drizzle-orm';

/** `YYYY-MM` + k oy. */
export const addMonths = (period: string, k: number): string => {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + k;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
};

/** Oyning oxirgi kuni (`YYYY-MM-DD`); joriy oy uchun — bugun. */
export const monthEnd = (period: string, today: string): string => {
  if (period === today.slice(0, 7)) return today;
  const [y, m] = period.split('-').map(Number) as [number, number];
  return `${period}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

type Span = { startDate: string; endDate: string | null };
const activeOn = (spans: readonly Span[], day: string) =>
  spans.some((s) => s.startDate <= day && (s.endDate === null || s.endDate >= day));

/**
 * Kohorta: o'quvchining birinchi yozilgan oyi. k-oy nuqtasi — o'sha oy oxirida (joriy oyda —
 * bugun) kamida bitta faol yozilishi bor o'quvchilar. Kelajak oylari qaytarilmaydi.
 */
export async function cohortRetention(
  db: Database,
  branchId: string,
  monthsCount: number,
  today: string,
) {
  const rows = await db
    .select({
      studentId: enrollments.studentId,
      startDate: enrollments.startDate,
      endDate: enrollments.endDate,
    })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .where(eq(groups.branchId, branchId));
  const spans = new Map<string, Span[]>();
  for (const r of rows) spans.set(r.studentId, [...(spans.get(r.studentId) ?? []), r]);
  const cohorts = new Map<string, string[]>();
  for (const [id, list] of spans) {
    const first = list.map((s) => s.startDate).sort()[0] ?? '';
    const month = first.slice(0, 7);
    cohorts.set(month, [...(cohorts.get(month) ?? []), id]);
  }
  const current = today.slice(0, 7);
  return [...cohorts.keys()]
    .sort()
    .slice(-monthsCount)
    .map((m) => {
      const ids = cohorts.get(m) ?? [];
      const retention = [0, 1, 2, 3]
        .filter((k) => addMonths(m, k) <= current)
        .map((k) => {
          const day = monthEnd(addMonths(m, k), today);
          const activeCount = ids.filter((id) => activeOn(spans.get(id) ?? [], day)).length;
          return {
            monthIndex: k,
            activeCount,
            retentionPercentBp: calculateRetentionRateBp(activeCount, ids.length),
          };
        });
      return { cohortMonth: m, initialCount: ids.length, retention };
    });
}

async function teacherAttendance(db: Database, branchId: string) {
  const rows = await db
    .select({
      teacherId: lessons.teacherId,
      present: sql<number>`count(case when ${attendance.status} = 'present' then 1 end)::int`,
      late: sql<number>`count(case when ${attendance.status} = 'late' then 1 end)::int`,
      total: sql<number>`count(${attendance.id})::int`,
    })
    .from(attendance)
    .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(groups.branchId, branchId))
    .groupBy(lessons.teacherId);
  return new Map(
    rows.map((r) => [
      r.teacherId,
      calculateAttendanceRateBp(Number(r.present), Number(r.late), Number(r.total)),
    ]),
  );
}

async function teacherGrades(db: Database, branchId: string) {
  const rows = await db
    .select({
      teacherId: lessons.teacherId,
      avg: sql<number>`avg(${grades.value})::float`,
    })
    .from(grades)
    .innerJoin(lessons, eq(lessons.id, grades.lessonId))
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(groups.branchId, branchId))
    .groupBy(lessons.teacherId);
  return new Map(rows.map((r) => [r.teacherId, Math.round(Number(r.avg) * 100)]));
}

/**
 * Ustoz samaradorligi: davomat (BR: kechikish — yarim), saqlash = faol yozilishlar / barcha
 * yozilishlar (ustoz guruhlarida), o'rtacha baho (0–100 → bp; baho yo'q — `null`).
 */
export async function teacherPerformance(db: Database, branchId: string) {
  const base = await db
    .select({
      teacherId: users.id,
      teacherName: users.fullName,
      groupCount: sql<number>`count(distinct ${groupTeachers.groupId})::int`,
      studentCount: sql<number>`count(distinct case when ${enrollments.endDate} is null then ${enrollments.studentId} end)::int`,
      enrolled: sql<number>`count(distinct ${enrollments.id})::int`,
      active: sql<number>`count(distinct case when ${enrollments.endDate} is null then ${enrollments.id} end)::int`,
    })
    .from(users)
    .innerJoin(groupTeachers, eq(groupTeachers.teacherId, users.id))
    .innerJoin(groups, eq(groups.id, groupTeachers.groupId))
    .leftJoin(enrollments, eq(enrollments.groupId, groups.id))
    .where(and(eq(groups.branchId, branchId), sql`${groups.status} <> 'finished'`))
    .groupBy(users.id, users.fullName);
  const [att, avg] = await Promise.all([
    teacherAttendance(db, branchId),
    teacherGrades(db, branchId),
  ]);
  return base.map((t) => ({
    teacherId: t.teacherId,
    teacherName: t.teacherName,
    groupCount: Number(t.groupCount),
    studentCount: Number(t.studentCount),
    attendancePercentBp: att.get(t.teacherId) ?? 0,
    retentionPercentBp: calculateRetentionRateBp(Number(t.active), Number(t.enrolled)),
    averageGradeScoreBp: avg.get(t.teacherId) ?? null,
  }));
}
