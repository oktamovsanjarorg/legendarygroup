import type { StudentProgressResponse } from '@lg/contracts';
import { formatDate } from '@lg/i18n';
import type { ChartPoint } from '@lg/ui-tg';
import type { ChildResults } from '../screens/guardian/results.js';
import { monthCalendar, type AttendanceHistoryRow } from './student-map.js';
import { atTashkent, weekDates } from './time.js';

/** `GET /grades/history` (ota-ona: faqat ota-onaga ko'rinadigan izohlar — server filtri). */
export interface GuardianGradesHistory {
  grades: { id: string; date: string; kind: 'homework' | 'activity'; value: number }[];
  comments: { id: string; text: string; createdAt: string; createdByName: string }[];
}

const WEEKS = 6;

/** Haftalik o'rtacha baho (dushanbadan), oxirgi 6 hafta — baho bor haftalar. */
export function weeklyProgress(grades: GuardianGradesHistory['grades']): ChartPoint[] {
  const byWeek = new Map<string, number[]>();
  for (const g of grades) {
    const monday = weekDates(g.date)[0] ?? g.date;
    byWeek.set(monday, [...(byWeek.get(monday) ?? []), g.value]);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-WEEKS)
    .map(([monday, values]) => ({
      label: formatDate(atTashkent(monday, '12:00')),
      value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    }));
}

export function childResults(input: {
  today: string;
  attendance: readonly AttendanceHistoryRow[];
  history: GuardianGradesHistory;
  progress: StudentProgressResponse | null;
}): ChildResults {
  return {
    month: monthCalendar(input.today, input.attendance),
    grades: input.history.grades.map((g) => ({
      id: g.id,
      date: atTashkent(g.date, '12:00'),
      kind: g.kind,
      value: String(g.value),
    })),
    comments: input.history.comments.map((c) => ({
      id: c.id,
      date: new Date(c.createdAt),
      text: c.text,
      teacher: c.createdByName,
    })),
    tests: (input.progress?.testResults ?? []).map((r) => ({
      id: r.testId,
      name: r.title,
      date: atTashkent(r.date, '12:00'),
      percent: Math.round(r.percent),
    })),
    progress: weeklyProgress(input.history.grades),
  };
}
