import type {
  PayrollItem,
  PayrollRunDetail,
  PayrollStaffOption,
  TeacherAdvance,
  TeacherContract,
} from '@lg/contracts';

const TEACHER = 'Aliyeva Dilnoza';
const at = '2026-11-01T05:00:00.000Z';

const item = (
  id: string,
  kind: PayrollItem['kind'],
  amount: string,
  details: Record<string, unknown> = {},
): PayrollItem => ({
  id,
  runId: 'r1',
  teacherId: 't1',
  teacherName: TEACHER,
  kind,
  amount,
  details,
  note: typeof details['reason'] === 'string' ? details['reason'] : null,
  createdAt: at,
});

export const payrollRun: PayrollRunDetail = {
  id: 'r1',
  branchId: 'b1',
  period: '2026-10',
  status: 'draft',
  totalAmount: '4250000',
  generatedAt: at,
  approvedBy: null,
  approvedAt: null,
  paidBy: null,
  paidAt: null,
  createdAt: at,
  updatedAt: at,
  teachers: [
    {
      teacherId: 't1',
      teacherName: TEACHER,
      totalNet: '4250000',
      earned: '5050000',
      extras: '200000',
      advances: '1000000',
      items: [
        item('i1', 'fixed', '1000000', {
          scheduledLessons: 12,
          substituteLessons: 2,
          days: 16,
          totalDays: 31,
        }),
        item('i2', 'percent', '4000000', { collectedBase: '10000000', percentBp: 4000 }),
        item('i3', 'per_lesson', '50000', { substituteLessons: 1, rate: '50000' }),
        item('i4', 'bonus', '200000', { reason: 'Olimpiada natijasi' }),
        item('i5', 'advance', '-1000000', { reason: 'Avans ushlab qolindi' }),
      ],
    },
  ],
};

export const contracts: TeacherContract[] = [
  {
    id: 'k1',
    branchId: 'b1',
    teacherId: 't1',
    teacherName: TEACHER,
    groupId: null,
    type: 'mixed',
    fixedAmount: '2000000',
    percentBp: 4000,
    perLessonRate: '50000',
    base: 'collected',
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: at,
    updatedAt: at,
  },
];

export const advances: TeacherAdvance[] = [
  {
    id: 'a1',
    teacherId: 't1',
    teacherName: TEACHER,
    amount: '1500000',
    withheld: '1000000',
    givenAt: '2026-10-12',
    note: 'Uy ijarasi uchun',
  },
];

export const payrollStaff: PayrollStaffOption[] = [
  { id: 't1', fullName: TEACHER, roles: ['teacher'] },
  { id: 't2', fullName: 'Karimov Jasur', roles: ['admin', 'teacher'] },
];
