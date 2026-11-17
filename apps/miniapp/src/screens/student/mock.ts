import type {
  LessonDto,
  StudentListRow,
  StudentProgressResponse,
  TestResultItem,
} from '@lg/contracts';

/** M-STU-* maket maʼlumotlari (faqat Storybook). */
export const LESSON: LessonDto = {
  id: 'l1',
  group: { id: 'g1', name: 'IELTS 7.0 (A)' },
  date: '2026-11-18',
  startTime: '14:00',
  endTime: '15:30',
  room: { id: 'r1', name: '101-xona' },
  teacher: { id: 'u1', name: 'Rustam Karimov' },
  isSubstitute: false,
  roomOverridden: false,
  status: 'scheduled',
  kind: 'regular',
  cancelReason: null,
  cancelSource: null,
  compensation: null,
  makeupLessonId: null,
  makeupForLessonId: null,
  topic: null,
};

export const STUDENT: StudentListRow = {
  id: 's1',
  code: 10042,
  fullName: 'Anvar Aliyev',
  birthDate: null,
  phone: '+998901112233',
  archivedAt: null,
  groups: [{ id: 'g1', name: 'IELTS 7.0 (A)' }],
  frozen: false,
  guardian: null,
};

export const PROGRESS: StudentProgressResponse = {
  studentId: 's1',
  studentName: 'Anvar Aliyev',
  groupId: 'g1',
  groupName: 'IELTS 7.0 (A)',
  rank: 2,
  totalStudents: 12,
  averageGrade: 4.5,
  attendanceRatePercent: 92,
  averageTestScorePercent: 81,
  compositeScore: 86,
  gradesTrend: [
    { lessonId: 'l1', date: '2026-11-03', kind: 'grade', value: 70 },
    { lessonId: 'l2', date: '2026-11-10', kind: 'grade', value: 85 },
    { lessonId: 'l3', date: '2026-11-14', kind: 'grade', value: 90 },
  ],
  attendanceTrend: [],
  testResults: [
    {
      testId: 't1',
      title: 'Mock Exam #1',
      date: '2026-11-07',
      score: 34,
      maxScore: 40,
      percent: 85,
    },
    { testId: 't2', title: 'Listening', date: '2026-11-14', score: 18, maxScore: 25, percent: 72 },
  ],
};

export const NO_TESTS: readonly TestResultItem[] = [];
