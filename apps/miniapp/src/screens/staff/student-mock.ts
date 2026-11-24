import type {
  EnrollmentDto,
  InvoiceWithLines,
  PaymentHistoryItem,
  PaymentView,
  StudentDetail,
} from '@lg/contracts';
import type { AttendanceHistoryItem } from '../../data/staff-profile.js';
import type { StudentFinance } from '../../data/staff-payments.js';

/** Story/test uchun: MS-23, MS-24, MS-17. */
export const TODAY = '2026-11-24';

export const studentDetail: StudentDetail = {
  id: 's1',
  code: 1024,
  fullName: 'Karimov Aziz',
  birthDate: '2012-03-04',
  phone: '+998901112233',
  archivedAt: null,
  gender: 'male',
  school: '12-maktab',
  grade: '7-B',
  source: 'referral',
  notes: null,
  photoFileId: null,
  guardians: [],
  accessCodeSet: true,
  telegramLinked: true,
  createdAt: '2026-09-01T05:00:00Z',
  updatedAt: '2026-09-01T05:00:00Z',
};

export const enrollment: EnrollmentDto = {
  id: 'e1',
  studentId: 's1',
  group: { id: 'g1', name: 'IELTS-1' },
  startDate: '2026-09-01',
  endDate: null,
  endReason: null,
  discountPercent: 10,
  state: 'frozen',
  freezes: [
    { id: 'f1', from: '2026-11-16', to: '2026-11-30', reason: 'Kasallik', approvedBy: null },
    { id: 'f2', from: '2026-12-10', to: '2026-12-24', reason: 'Safar', approvedBy: null },
  ],
};

export const groupOptions = [
  { id: 'g2', name: 'IELTS-2', course: { id: 'c1', name: 'IELTS' } },
  { id: 'g3', name: 'Matematika 7', course: { id: 'c2', name: 'Matematika' } },
];

export const attendanceItems: AttendanceHistoryItem[] = [
  {
    id: 'a1',
    date: '2026-11-20',
    startTime: '15:00:00',
    groupName: 'IELTS-1',
    status: 'late',
    lateMinutes: 10,
    note: null,
  },
  {
    id: 'a2',
    date: '2026-11-18',
    startTime: '15:00:00',
    groupName: 'IELTS-1',
    status: 'absent',
    lateMinutes: null,
    note: 'Qoʻngʻiroq qilindi',
  },
];

export const paymentView: PaymentView = {
  id: 'p1',
  studentId: 's1',
  studentName: 'Karimov Aziz',
  kind: 'payment',
  amount: '600000',
  method: 'cash',
  paidAt: '2026-11-20T10:00:00Z',
  receiptNumber: 'LG-2026-000123',
  verifyUrl: null,
  createdBy: 'Aliyeva Nodira',
  viaSubmission: false,
  allocations: [{ period: '2026-11', amount: '600000' }],
  reversed: null,
  canReverseNow: false,
};

const row = (over: Partial<PaymentHistoryItem>): PaymentHistoryItem => ({
  id: 'p1',
  studentId: 's1',
  student: 'Karimov Aziz',
  kind: 'payment',
  amount: '600000',
  method: 'cash',
  paidAt: '2026-11-20T10:00:00Z',
  receiptNumber: 'LG-2026-000123',
  cancelled: false,
  ...over,
});
export const historyItems = [
  row({}),
  row({ id: 'p2', student: 'Valiyeva Lola', cancelled: true }),
  row({ id: 'p3', student: 'Valiyeva Lola', kind: 'reversal', amount: '-600000' }),
];

const base = {
  id: 'i1',
  branchId: 'b1',
  studentId: 's1',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};
const line = (id: string, kind: 'tuition' | 'penalty', amount: string, description: string) => ({
  id,
  invoiceId: 'i1',
  enrollmentId: 'e1',
  kind,
  amount,
  description,
  createdAt: base.createdAt,
});
export const invoice: InvoiceWithLines = {
  ...base,
  period: '2026-11',
  dueDate: '2026-11-10',
  total: '650000',
  status: 'open',
  lines: [
    line('l1', 'tuition', '600000', 'IELTS-1 oylik toʻlovi (2026-11)'),
    line('l2', 'penalty', '50000', 'Jarima: 4 sababsiz, 1 kech'),
    line('l3', 'penalty', '0', 'Jarima: bekor qilingan'),
  ],
};

export const finance: StudentFinance = {
  summary: {
    studentId: 's1',
    balance: '120000',
    totalDebt: '0',
    totalAdvance: '120000',
    isCritical: false,
  },
  invoices: [invoice],
  payments: [
    {
      id: 'p1',
      branchId: 'b1',
      studentId: 's1',
      amount: '770000',
      method: 'card',
      paidAt: '2026-11-05T10:00:00Z',
      receivedBy: null,
      receiptNumber: 'LG-2026-000100',
      allocations: [],
      advance: '120000',
      createdAt: '2026-11-05T10:00:00Z',
    },
  ],
};
