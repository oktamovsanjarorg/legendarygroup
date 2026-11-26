import type {
  CashDay,
  ExpenseItem,
  GuardianLinkRequest,
  MonthlyPnLSummary,
  StudentListRow,
  TicketDetail,
} from '@lg/contracts';

/** Storybook va testlar uchun namunalar (ilova kodi import qilmaydi). */
const AT = '2026-11-24T05:00:00.000Z';

export const linkReq: GuardianLinkRequest = {
  id: 'r1',
  telegramId: '1',
  telegramUsername: 'nodira',
  phone: '+998901234567',
  fullName: 'Aliyeva Nodira',
  status: 'pending',
  createdAt: AT,
  updatedAt: AT,
};

export const studentRow: StudentListRow = {
  id: 's1',
  code: 10001,
  fullName: 'Aliyev Jasur',
  phone: null,
  birthDate: null,
  photoFileId: null,
  status: 'active',
  archivedAt: null,
  groups: [],
  frozen: false,
  guardian: null,
} as unknown as StudentListRow;

export const ticket: TicketDetail = {
  id: 't1',
  branchId: 'b',
  authorId: 'u1',
  authorName: 'Aliyeva Nodira',
  authorPhone: '+998901234567',
  studentId: 's1',
  studentName: 'Aliyev Jasur',
  subject: 'Dars vaqti haqida',
  status: 'open',
  priority: 'normal',
  assignedTo: null,
  assignedToName: null,
  lastMessageAt: AT,
  createdAt: AT,
  updatedAt: AT,
  messages: [
    {
      id: 'm1',
      ticketId: 't1',
      authorId: 'u1',
      authorName: 'Aliyeva Nodira',
      authorRole: 'author',
      text: 'Ertaga dars boʻladimi?',
      fileUrl: null,
      createdAt: AT,
    },
    {
      id: 'm2',
      ticketId: 't1',
      authorId: 'a1',
      authorName: 'Karimova Dilnoza',
      authorRole: 'staff',
      text: 'Ha, soat 10:00 da.',
      fileUrl: null,
      createdAt: AT,
    },
  ],
};

export const cashDay: CashDay = {
  date: '2026-11-24',
  expectedCash: '1300000',
  payments: [
    { id: 'p1', paidAt: AT, student: 'Aliyev Jasur', amount: '1300000', receiptNumber: 'LG-1' },
  ],
  closed: null,
};

export const pnl: MonthlyPnLSummary = {
  period: '2026-11',
  revenue: '10000000',
  expenses: '3200000',
  payroll: '4000000',
  payrollPending: false,
  totalCosts: '7200000',
  netProfit: '2800000',
  profitMarginBp: 2850,
  expensesByCategory: { rent: '3200000' },
  revenueByMethod: { cash: '6000000', card: '4000000' },
};

export const expense: ExpenseItem = {
  id: 'e1',
  branchId: 'b',
  category: 'rent',
  amount: '2700000',
  date: '2026-11-04',
  note: 'Noyabr',
  fileId: null,
  createdBy: 'u',
  createdByName: 'Direktor',
  createdAt: AT,
  updatedAt: AT,
};
