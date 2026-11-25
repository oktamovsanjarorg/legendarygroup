import type {
  Course,
  DayAttendance,
  GroupDetail,
  GroupListItem,
  LessonDto,
  RosterItem,
  UnmarkedLessonItem,
} from '@lg/contracts';
import { lesson } from './lists-mock.js';

/** Storybook va testlar uchun namuna (MS-12/13/20/21/22). */
const slot = (weekday: number) => ({
  id: `s${weekday}`,
  weekday,
  startTime: '15:00',
  endTime: '16:30',
  validFrom: '2026-09-01',
  validTo: null,
});

export const groupItem: GroupListItem = {
  id: 'g1',
  name: 'IELTS A1',
  status: 'active',
  course: { id: 'c1', name: 'Ingliz tili' },
  room: { id: 'r1', name: '2-xona' },
  monthlyPrice: '650000',
  maxStudents: 12,
  startDate: '2026-09-01',
  endDate: null,
  mainTeacher: { id: 't1', fullName: 'Karimov Anvar' },
  slots: [slot(1), slot(3), slot(5)],
};

export const group: GroupDetail = {
  ...groupItem,
  gradingConfig: { scale: '0_5', kinds: ['homework'] },
  teachers: [
    {
      id: 'a1',
      teacherId: 't1',
      fullName: 'Karimov Anvar',
      role: 'main',
      from: '2026-09-01',
      to: null,
    },
    {
      id: 'a2',
      teacherId: 't2',
      fullName: 'Sodiqova Lola',
      role: 'assistant',
      from: '2026-10-01',
      to: null,
    },
  ],
  schedule: [slot(1), slot(3), slot(5)],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const roster: RosterItem[] = [
  { enrollmentId: 'e1', studentId: 's1', code: 1001, fullName: 'Aliyev Jasur', state: 'active' },
  { enrollmentId: 'e2', studentId: 's2', code: 1002, fullName: 'Rahimova Malika', state: 'frozen' },
];

export const cancelledLesson: LessonDto = {
  ...lesson,
  id: 'les2',
  status: 'cancelled',
  cancelReason: 'Ustoz kasal',
  cancelSource: 'manual',
};

export const course: Course = {
  id: 'c1',
  name: 'Ingliz tili',
  description: null,
  levels: ['A1', 'A2'],
  defaultMonthlyPrice: '650000',
  lessonDurationMin: 90,
  durationMonths: 6,
  gradeScale: '0_5',
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const day: DayAttendance = {
  date: '2026-11-24',
  lessons: [
    {
      lessonId: 'les1',
      groupId: 'g1',
      groupName: 'IELTS A1',
      teacherName: 'Karimov Anvar',
      startTime: '09:00',
      endTime: '10:30',
      cancelled: false,
      expected: 12,
      marked: 12,
      came: 10,
    },
    {
      lessonId: 'les2',
      groupId: 'g2',
      groupName: 'Matematika 7',
      teacherName: null,
      startTime: '11:00',
      endTime: '12:30',
      cancelled: false,
      expected: 8,
      marked: 0,
      came: 0,
    },
  ],
  absentees: [
    {
      lessonId: 'les1',
      studentId: 's1',
      studentName: 'Aliyev Jasur',
      groupName: 'IELTS A1',
      status: 'absent',
      lateMinutes: null,
    },
    {
      lessonId: 'les1',
      studentId: 's2',
      studentName: 'Rahimova Malika',
      groupName: 'IELTS A1',
      status: 'late',
      lateMinutes: 20,
    },
  ],
};

export const oldUnmarked: UnmarkedLessonItem = {
  lessonId: 'les9',
  groupId: 'g1',
  groupName: 'IELTS A1',
  courseName: 'Ingliz tili',
  teacherId: 't1',
  teacherName: 'Karimov Anvar',
  date: '2026-11-20',
  startTime: '15:00',
  endTime: '16:30',
  minutesPassed: 5000,
};
