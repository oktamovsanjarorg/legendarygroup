import type { RosterStudent } from './attendance-marks.js';
import type { GroupStudent } from './group.js';
import type { TeacherGroup } from './groups.js';
import type { TodayLesson } from './today.js';

/** Maket ma'lumotlari (T-017c) — real ismlarga o'xshash, lekin to'qima. */
const at = (hhmm: string) => new Date(`2026-11-12T${hhmm}:00+05:00`);

export const NAMES = [
  'Abdullayev Jasur',
  'Aliyeva Madina',
  'Boboyev Sardor',
  'Ergasheva Nilufar',
  'Fayzullayev Bekzod',
  'Gʻaniyeva Shahzoda',
  'Hasanov Otabek',
  'Ibragimova Dildora',
  'Jo‘rayev Sherzod',
  'Karimova Zarina',
  'Latipov Doniyor',
  'Mahmudova Sevara',
  'Nazarov Islom',
  'Oʻrinboyeva Malika',
  'Qodirov Azizbek',
  'Rahimova Gulnoza',
  'Saidov Temur',
  'Toshmatova Mohinur',
  'Usmonov Behruz',
  'Yusupova Kamola',
].map((n) => n.replace('‘', 'ʻ'));

export const ROSTER: RosterStudent[] = NAMES.map((name, i) => ({
  id: `s${i + 1}`,
  name,
  preExcused: i === 6,
}));

export const LONG_ROSTER: RosterStudent[] = [
  { id: 'l1', name: 'Abdurahmonova Muxlisaxon Abdumalikovna', preExcused: true },
  ...ROSTER.slice(0, 5),
];

export const LESSON = {
  id: 'L1',
  groupName: 'IELTS 7.0 — B2-guruh',
  courseName: 'Ingliz tili',
  startsAt: at('15:00'),
  endsAt: at('16:30'),
  room: '204-xona',
};

export const QUIET_UNTIL = at('16:34');

export const TODAY: TodayLesson[] = [
  {
    ...LESSON,
    id: 'L0',
    groupName: 'Matematika — A1',
    courseName: 'Matematika',
    startsAt: at('09:00'),
    endsAt: at('10:30'),
    room: '101-xona',
    state: { kind: 'marked', present: 14, total: 15 },
  },
  {
    ...LESSON,
    id: 'L2',
    groupName: 'Matematika — A3',
    courseName: 'Matematika',
    startsAt: at('11:00'),
    endsAt: at('12:30'),
    room: '101-xona',
    state: { kind: 'unmarked' },
  },
  { ...LESSON, state: { kind: 'now' } },
  {
    ...LESSON,
    id: 'L3',
    groupName: 'IELTS 6.0 — B1',
    startsAt: at('17:00'),
    endsAt: at('18:30'),
    room: '305-xona',
    substitute: true,
    state: { kind: 'upcoming' },
  },
];

export const GROUPS: TeacherGroup[] = [
  {
    id: 'g1',
    name: 'IELTS 7.0 — B2-guruh',
    courseName: 'Ingliz tili',
    studentCount: 20,
    role: 'main',
  },
  { id: 'g2', name: 'Matematika — A1', courseName: 'Matematika', studentCount: 15, role: 'main' },
  {
    id: 'g3',
    name: 'IELTS 6.0 — B1',
    courseName: 'Ingliz tili',
    studentCount: 18,
    role: 'assistant',
  },
];

export const GROUP_STUDENTS: GroupStudent[] = NAMES.slice(0, 12).map((name, i) => ({
  id: `s${i + 1}`,
  name,
  attendanceRate: [98, 92, 76, 100, 64, 88, 95, 81, 70, 100, 90, 58][i] ?? 90,
  lastGrade: i % 3 === 0 ? undefined : String(5 - (i % 3)),
}));
