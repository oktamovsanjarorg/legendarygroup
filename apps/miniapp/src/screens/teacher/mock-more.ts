import type { StripDay } from '@lg/ui-tg';
import { NAMES } from './mock.js';
import type { PayrollDetail, PayrollMonth } from './payroll.js';
import type { ScheduleLesson } from './schedule.js';
import type { StudentProfile } from './student.js';
import type { ColumnMap, ImportRow } from './test-import.js';
import type { GroupTest } from './tests.js';

/** T-017c 2-qism maket ma'lumotlari (MT-06…MT-11). */
const d = (iso: string) => new Date(`${iso}+05:00`);
const name = (i: number) => NAMES[i] ?? 'Oʻquvchi';

export const PROFILE: StudentProfile = {
  name: name(1),
  groupName: 'IELTS 7.0 — B2-guruh',
  // Noyabr 2026: 1-kun — yakshanba (offset 6).
  month: {
    title: 'Noyabr',
    offset: 6,
    daysInMonth: 30,
    marks: {
      2: 'present',
      4: 'present',
      6: 'late',
      9: 'present',
      11: 'absent',
      13: 'present',
      16: 'excused',
      18: 'present',
    },
  },
  grades: [
    { id: 'g1', date: d('2026-11-11T15:00:00'), kind: 'homework', value: '5' },
    { id: 'g2', date: d('2026-11-11T15:00:00'), kind: 'activity', value: '4' },
    { id: 'g3', date: d('2026-11-09T15:00:00'), kind: 'homework', value: '3' },
  ],
  comments: [
    {
      id: 'c1',
      date: d('2026-11-09T16:40:00'),
      text: 'Uy vazifalarini muntazam bajaryapti. Speaking boʻyicha qoʻshimcha mashq tavsiya qilaman.',
      visibility: 'parent',
    },
    {
      id: 'c2',
      date: d('2026-11-02T16:35:00'),
      text: 'Darsda telefon bilan chalgʻiydi — ota-onaga hozircha aytmaymiz, kuzatamiz.',
      visibility: 'internal',
    },
  ],
  editableUntil: d('2026-11-14T23:59:00'),
};

export const TESTS: GroupTest[] = [
  {
    id: 't1',
    name: 'Mock IELTS — Reading',
    date: d('2026-11-10T15:00:00'),
    maxScore: 40,
    state: 'imported',
  },
  {
    id: 't2',
    name: 'Unit 5 — Grammar',
    date: d('2026-11-03T15:00:00'),
    maxScore: 100,
    state: 'published',
  },
  {
    id: 't3',
    name: 'Mock IELTS — Listening',
    date: d('2026-11-17T15:00:00'),
    maxScore: 40,
    state: 'draft',
  },
];

export const COLUMNS: ColumnMap[] = [
  { column: 'B', field: 'Oʻquvchi (F.I.Sh)' },
  { column: 'C', field: 'Ball' },
];

export const IMPORT_ROWS: ImportRow[] = [
  ...[0, 2, 3, 4, 5, 7, 8].map((i, k) => ({
    row: k + 2,
    kind: 'matched' as const,
    name: name(i),
    score: 25 + ((i * 7) % 15),
  })),
  { row: 9, kind: 'fuzzy', raw: 'Aliyeva Madinaxon', suggestion: name(1), score: 33 },
  { row: 10, kind: 'fuzzy', raw: 'Hasanov Otabek A.', suggestion: name(6), score: 29 },
  { row: 11, kind: 'not_found', raw: 'Rustamov Anvar' },
  { row: 12, kind: 'bad_score', raw: name(9), value: '45' },
];

export const IMPORT_RESOLVED: ImportRow[] = IMPORT_ROWS.map((r) =>
  r.kind === 'fuzzy' ? { ...r, decision: r.row === 9 ? 'accept' : 'reject' } : r,
);

export const WEEK: StripDay[] = [9, 10, 11, 12, 13, 14, 15].map((day) => ({
  date: `2026-11-${day}`,
  day,
  busy: day !== 15,
}));

export const SCHEDULE: ScheduleLesson[] = [
  {
    id: 'L0',
    groupName: 'Matematika — A1',
    courseName: 'Matematika',
    startsAt: d('2026-11-12T09:00:00'),
    endsAt: d('2026-11-12T10:30:00'),
    room: '101-xona',
  },
  {
    id: 'L1',
    groupName: 'IELTS 7.0 — B2-guruh',
    courseName: 'Ingliz tili',
    startsAt: d('2026-11-12T15:00:00'),
    endsAt: d('2026-11-12T16:30:00'),
    room: '204-xona',
  },
  {
    id: 'L3',
    groupName: 'IELTS 6.0 — B1',
    courseName: 'Ingliz tili',
    startsAt: d('2026-11-12T17:00:00'),
    endsAt: d('2026-11-12T18:30:00'),
    room: '305-xona',
    substituteFor: 'Karimov Rustam',
  },
];

export const MONTHS: PayrollMonth[] = [
  { id: 'm11', title: 'Noyabr 2026', total: 6_840_000n, state: 'draft' },
  { id: 'm10', title: 'Oktyabr 2026', total: 7_215_000n, state: 'paid' },
  { id: 'm09', title: 'Sentyabr 2026', total: 6_480_000n, state: 'paid' },
];

export const PAYROLL_DETAIL: PayrollDetail = {
  month: { id: 'm10', title: 'Oktyabr 2026', total: 7_215_000n, state: 'paid' },
  fixed: 3_000_000n,
  percent: { rate: 30, amount: 3_915_000n },
  substituteLessons: { count: 3, amount: 450_000n },
  bonus: 150_000n,
  penalty: 300_000n,
  // 30% × 13 050 000 (yig'ilgan to'lovlar) = 3 915 000 = 20 × 195 750 — summa jamiga mos.
  byStudent: NAMES.map((n) => ({ name: n, amount: 195_750n })),
};
