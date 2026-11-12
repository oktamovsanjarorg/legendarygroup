import type { ChildTab } from '@lg/ui-tg';
import { PROFILE, SCHEDULE } from '../teacher/mock-more.js';
import type { ChildSummary } from './home.js';
import type { Invoice, PaymentRow } from './payments.js';
import type { ChildReport } from './report.js';
import type { ChildResults } from './results.js';
import type { TestResult } from './test-result.js';
import type { Ticket } from './tickets.js';

/** T-017c 3-qism maket ma'lumotlari (MG-*). Narx: 650 000 soʻm/oy. */
const d = (iso: string) => new Date(`${iso}+05:00`);

export const CHILDREN: ChildSummary[] = [
  {
    id: 'c1',
    name: 'Aliyeva Madina',
    today: { kind: 'present' },
    // Bugungi dars o'tdi — keyingisi juma kuni.
    next: SCHEDULE[1] && {
      ...SCHEDULE[1],
      startsAt: d('2026-11-14T15:00:00'),
      endsAt: d('2026-11-14T16:30:00'),
    },
    debt: 650_000n,
    dueDate: d('2026-11-10T23:59:00'),
  },
  {
    id: 'c2',
    name: 'Aliyev Sardor',
    today: { kind: 'pending', at: d('2026-11-12T17:00:00') },
    next: SCHEDULE[2],
    debt: -150_000n,
  },
];
export const CHILD_TABS: ChildTab[] = CHILDREN.map((c) => ({
  id: c.id,
  name: c.name.split(' ')[1] ?? c.name,
}));

export const RESULTS: ChildResults = {
  month: PROFILE.month,
  grades: PROFILE.grades,
  comments: [
    {
      id: 'c1',
      date: d('2026-11-09T16:40:00'),
      teacher: 'Karimov Rustam',
      text: PROFILE.comments[0]?.text ?? '',
    },
  ],
  tests: [
    { id: 't1', name: 'Mock IELTS — Reading', date: d('2026-11-10T15:00:00'), percent: 83 },
    { id: 't2', name: 'Unit 5 — Grammar', date: d('2026-11-03T15:00:00'), percent: 76 },
  ],
  progress: [
    { label: '13-okt', value: 3.6 },
    { label: '20-okt', value: 3.9 },
    { label: '27-okt', value: 3.8 },
    { label: '3-noy', value: 4.2 },
    { label: '10-noy', value: 4.4 },
  ],
};

export const TEST_RESULT: TestResult = {
  name: 'Mock IELTS — Reading',
  date: d('2026-11-10T15:00:00'),
  score: 33,
  max: 40,
  sections: [
    { name: 'Passage 1', score: 12, max: 13 },
    { name: 'Passage 2', score: 11, max: 13 },
    { name: 'Passage 3', score: 10, max: 14 },
  ],
  groupAveragePercent: 71,
};

export const WEEKLY: ChildReport = {
  kind: 'weekly',
  childName: 'Aliyeva Madina',
  period: '3–9-noyabr',
  attended: 3,
  total: 3,
  averageGrade: '4,2',
  debt: 650_000n,
  comments: [{ teacher: 'Karimov Rustam', text: PROFILE.comments[0]?.text ?? '' }],
  hasPdf: false,
};
export const MONTHLY: ChildReport = {
  ...WEEKLY,
  kind: 'monthly',
  period: 'Oktyabr 2026',
  attended: 11,
  total: 12,
  averageGrade: '4,0',
  debt: 0n,
  hasPdf: true,
};

export const INVOICES: Invoice[] = [
  {
    id: 'i11',
    month: 'Noyabr 2026',
    amount: 650_000n,
    paid: 0n,
    dueDate: d('2026-11-10T23:59:00'),
    overdue: true,
  },
  {
    id: 'i10',
    month: 'Oktyabr 2026',
    amount: 650_000n,
    paid: 650_000n,
    dueDate: d('2026-10-10T23:59:00'),
    overdue: false,
  },
  {
    id: 'i09',
    month: 'Sentyabr 2026',
    amount: 650_000n,
    paid: 650_000n,
    dueDate: d('2026-09-10T23:59:00'),
    overdue: false,
  },
];
export const INVOICES_PARTIAL: Invoice[] = INVOICES.map((i) =>
  i.id === 'i11' ? { ...i, paid: 300_000n, overdue: false } : i,
);

export const PAYMENTS: PaymentRow[] = [
  {
    id: 'p2',
    date: d('2026-10-08T12:10:00'),
    amount: 650_000n,
    method: 'transfer',
    receiptNo: 'LG-2026-000418',
  },
  {
    id: 'p1',
    date: d('2026-09-05T10:30:00'),
    amount: 650_000n,
    method: 'cash',
    receiptNo: 'LG-2026-000233',
  },
];

export const CARD = { number: '8600 1234 5678 9012', holder: 'LEGENDARY GROUP MCHJ' };

export const TICKETS: Ticket[] = [
  {
    id: 'k1',
    status: 'answered',
    messages: [
      {
        id: 'm1',
        from: 'me',
        text: 'Assalomu alaykum. Dekabrda dars jadvali oʻzgaradimi?',
        at: d('2026-11-10T09:12:00'),
      },
      {
        id: 'm2',
        from: 'center',
        text: 'Vaalaykum assalom! Yoʻq, jadval oʻzgarmaydi. Yangi yil taʼtili 30-dekabrdan.',
        at: d('2026-11-10T10:05:00'),
      },
    ],
  },
  {
    id: 'k2',
    status: 'open',
    messages: [
      {
        id: 'm3',
        from: 'me',
        text: 'Noyabr uchun chekni yubordim, tekshirib bera olasizmi?',
        at: d('2026-11-12T08:40:00'),
      },
    ],
  },
];
