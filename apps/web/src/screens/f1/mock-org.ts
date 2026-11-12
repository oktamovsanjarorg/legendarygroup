import type { AttendanceGrid } from './attendance-grid.js';
import type { Course, Room } from './courses.js';
import type { WebKpi } from './dashboard.js';
import type { GroupRow } from './groups.js';
import { GROUPS, NAMES } from './mock-people.js';
import type { CenterSettings } from './settings.js';
import type { LessonCell } from './types.js';

/** T-017c 5a maket ma'lumotlari — tashkiliy (W-04, W-09…W-12, W-29). */

export const KPI: WebKpi = {
  revenueMonth: 78_650_000n,
  revenueDelta: 6,
  debtTotal: 14_300_000n,
  activeStudents: 186,
  attendance: 91,
  queue: 3,
  unmarked: 1,
  joined: 14,
  left: 5,
  daily: Array.from({ length: 12 }, (_, i) => ({
    day: i + 1,
    amount: BigInt(3_250_000 + ((i * 1_370_000) % 6_500_000)),
  })),
};

export const LESSONS: LessonCell[] = [
  {
    id: 'l1',
    day: 3,
    start: '09:00',
    end: '10:30',
    group: 'Matematika — A1',
    teacher: 'Saidova Lola',
    room: '101-xona',
  },
  {
    id: 'l2',
    day: 3,
    start: '11:00',
    end: '12:30',
    group: 'Matematika — A3',
    teacher: 'Saidova Lola',
    room: '101-xona',
  },
  {
    id: 'l3',
    day: 3,
    start: '15:00',
    end: '16:30',
    group: 'IELTS 7.0 — B2-guruh',
    teacher: 'Karimov Rustam',
    room: '204-xona',
  },
  {
    id: 'l4',
    day: 3,
    start: '17:00',
    end: '18:30',
    group: 'IELTS 6.0 — B1',
    teacher: 'Karimov Rustam',
    room: '305-xona',
    kind: 'substitute',
  },
  {
    id: 'l5',
    day: 0,
    start: '15:00',
    end: '16:30',
    group: 'IELTS 7.0 — B2-guruh',
    teacher: 'Karimov Rustam',
    room: '204-xona',
  },
  {
    id: 'l6',
    day: 0,
    start: '09:00',
    end: '10:30',
    group: 'Matematika — A1',
    teacher: 'Saidova Lola',
    room: '101-xona',
  },
  {
    id: 'l7',
    day: 1,
    start: '17:00',
    end: '18:30',
    group: 'IELTS 6.0 — B1',
    teacher: 'Karimov Rustam',
    room: '305-xona',
  },
  {
    id: 'l8',
    day: 2,
    start: '11:00',
    end: '12:30',
    group: 'Matematika — A3',
    teacher: 'Saidova Lola',
    room: '101-xona',
    kind: 'cancelled',
  },
  {
    id: 'l9',
    day: 2,
    start: '15:00',
    end: '16:30',
    group: 'IELTS 7.0 — B2-guruh',
    teacher: 'Karimov Rustam',
    room: '204-xona',
  },
  {
    id: 'l10',
    day: 4,
    start: '09:00',
    end: '10:30',
    group: 'Matematika — A1',
    teacher: 'Saidova Lola',
    room: '101-xona',
  },
  {
    id: 'l11',
    day: 5,
    start: '10:00',
    end: '11:30',
    group: 'IELTS 7.0 — B2-guruh',
    teacher: 'Karimov Rustam',
    room: '204-xona',
    kind: 'extra',
  },
];

export const COURSES: Course[] = [
  { id: 'c1', name: 'Ingliz tili (IELTS)', price: 650_000n, months: 9, groups: 6 },
  { id: 'c2', name: 'Matematika', price: 550_000n, months: 12, groups: 4 },
];
export const ROOMS: Room[] = [
  { id: 'r1', name: '101-xona', capacity: 16, groups: 3 },
  { id: 'r2', name: '204-xona', capacity: 20, groups: 4 },
  { id: 'r3', name: '305-xona', capacity: 12, groups: 3 },
];

export const GROUP_ROWS: GroupRow[] = [
  {
    id: 'g1',
    name: 'IELTS 7.0 — B2-guruh',
    course: 'Ingliz tili',
    teacher: 'Karimov Rustam',
    schedule: 'Du/Ch/Ju 15:00',
    size: 20,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'g2',
    name: 'Matematika — A1',
    course: 'Matematika',
    teacher: 'Saidova Lola',
    schedule: 'Du/Ch/Ju 09:00',
    size: 15,
    capacity: 16,
    status: 'active',
  },
  {
    id: 'g3',
    name: 'IELTS 6.0 — B1',
    course: 'Ingliz tili',
    teacher: 'Karimov Rustam',
    schedule: 'Se/Pa 17:00',
    size: 18,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'g4',
    name: 'IELTS 7.0 — B3-guruh',
    course: 'Ingliz tili',
    teacher: 'Saidova Lola',
    schedule: 'Se/Pa/Sh 10:00',
    size: 6,
    capacity: 16,
    status: 'forming',
  },
];

const marks = ['present', 'absent', 'late', 'excused', null] as const;
export const GRID: AttendanceGrid = {
  groups: GROUPS,
  group: GROUPS[0] ?? '',
  dates: ['27.10', '29.10', '31.10', '03.11', '05.11', '07.11', '10.11', '12.11'],
  unmarked: [7],
  rows: NAMES.slice(0, 10).map((name, r) => ({
    id: `s${r}`,
    name,
    marks: Array.from({ length: 8 }, (_, c) =>
      c === 7
        ? null
        : (r * 3 + c) % 11 === 0
          ? marks[1]
          : (r + c) % 13 === 0
            ? marks[2]
            : r === 6 && c === 5
              ? marks[3]
              : marks[0],
    ),
  })),
};

export const SETTINGS: CenterSettings = {
  name: 'Legendary Group',
  phone: '+998 71 200 00 00',
  address: 'Toshkent, Chilonzor tumani',
  card: '8600 1234 5678 9012',
  cardHolder: 'LEGENDARY GROUP MCHJ',
  dueDay: 10,
  adminDiscountLimit: 10,
  lateThreshold: 15,
  reminderAfter: 30,
};
