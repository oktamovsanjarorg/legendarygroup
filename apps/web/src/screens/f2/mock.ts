import { must } from '../story-kit.js';
import type { WebApproval } from './approvals.js';
import type { CashDay } from './cash.js';
import type { DebtorRow } from './debtors.js';
import type { DiscountRow } from './discounts.js';
import type { PayEntryState, PayStudent } from './pay-entry.js';
import type { PaymentDetail } from './payment-detail.js';
import type { WebQueueItem } from './queue.js';

/** T-017c 5b maket ma'lumotlari (W-13…W-18, W-31, W-34). Narx: 650 000 soʻm/oy. */
const d = (iso: string) => new Date(`${iso}+05:00`);

export const PAY_STUDENTS: PayStudent[] = [
  {
    id: 's2',
    name: 'Aliyeva Madina',
    code: 'LG-1041',
    group: 'IELTS 7.0 — B2-guruh',
    debt: 1_300_000n,
  },
  { id: 's9', name: 'Aliyev Sardor', code: 'LG-1043', group: 'IELTS 6.0 — B1', debt: 0n },
  { id: 's5', name: 'Alimova Kamola', code: 'LG-0981', group: 'Matematika — A1', debt: 550_000n },
];

/** BR-12 (allocateFifo, server): 1 500 000 → okt 650 000 + noy 650 000, avans 200 000. */
export const PAY_FILLED: PayEntryState = {
  query: '',
  results: [],
  highlighted: 0,
  student: must(PAY_STUDENTS[0]),
  amount: 1_500_000n,
  method: 'cash',
  preview: {
    parts: [
      { month: 'Oktyabr 2026', amount: 650_000n, closes: true },
      { month: 'Noyabr 2026', amount: 650_000n, closes: true },
    ],
    advance: 200_000n,
  },
};
export const PAY_SEARCH: PayEntryState = {
  query: 'ali',
  results: PAY_STUDENTS,
  highlighted: 0,
  student: null,
  amount: null,
  method: 'cash',
  preview: null,
};
export const PAY_SAVED: PayEntryState = { ...PAY_FILLED, savedReceipt: 'LG-2026-000513' };

/** Chek rasmi o'rnida (tashqi so'rovsiz) — summa har elementning o'ziniki. */
const receipt = (sum: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="560"><rect width="360" height="560" fill="#fff"/><text x="180" y="80" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#1f2a37">Payme</text><text x="180" y="170" font-family="sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="#0f9d58">${sum} so'm</text><text x="180" y="215" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#6b7280">12.11.2026 08:29</text></svg>`,
  )}`;
export const QUEUE_WEB: WebQueueItem[] = [
  {
    id: 'q1',
    imageUrl: receipt('650 000'),
    student: 'Aliyeva Madina',
    group: 'IELTS 7.0 — B2-guruh',
    guardian: 'Aliyev Bahodir',
    amount: 650_000n,
    sentAt: d('2026-11-12T08:31:00'),
    comment: 'Noyabr uchun',
  },
  {
    id: 'q2',
    imageUrl: receipt('550 000'),
    student: 'Boboyev Sardor',
    group: 'Matematika — A1',
    guardian: 'Boboyeva Nodira',
    amount: 550_000n,
    sentAt: d('2026-11-12T09:02:00'),
    duplicate: 'Shunga oʻxshash chek 08:55 da yuborilgan (550 000 soʻm).',
  },
  {
    id: 'q3',
    imageUrl: receipt('1 300 000'),
    student: 'Hasanov Otabek',
    group: 'IELTS 6.0 — B1',
    guardian: 'Hasanova Malika',
    amount: 1_300_000n,
    sentAt: d('2026-11-11T07:15:00'),
    overdue: true,
  },
];

/** Jami = qatorlar yig'indisi: 1 300 000 + 650 000 + 1 950 000 + 550 000 = 4 450 000. */
export const DEBTORS: DebtorRow[] = [
  {
    id: 'a',
    name: 'Hasanov Otabek',
    group: 'IELTS 6.0 — B1',
    debt: 1_300_000n,
    overdueDays: 33,
    lastPayment: d('2026-09-06T10:00:00'),
    reminders: 5,
    critical: true,
  },
  {
    id: 'b',
    name: 'Aliyeva Madina',
    group: 'IELTS 7.0 — B2-guruh',
    debt: 650_000n,
    overdueDays: 2,
    lastPayment: d('2026-10-08T12:10:00'),
    reminders: 1,
    critical: false,
  },
  {
    id: 'c',
    name: 'Gʻaniyeva Shahzoda',
    group: 'Matematika — A3',
    debt: 1_950_000n,
    overdueDays: 63,
    lastPayment: d('2026-08-04T09:30:00'),
    reminders: 8,
    critical: true,
  },
  {
    id: 'e',
    name: 'Alimova Kamola',
    group: 'Matematika — A1',
    debt: 550_000n,
    overdueDays: 9,
    lastPayment: d('2026-10-03T15:00:00'),
    reminders: 3,
    critical: false,
  },
];
export const DEBT_TOTAL = 4_450_000n;

/** Kutilgan = naqd to'lovlar yig'indisi: 650 000 × 2 + 550 000 × 2 + 200 000 = 2 600 000. */
export const CASH_DAY: CashDay = {
  date: '12-noyabr, 2026',
  expected: 2_600_000n,
  payments: [
    {
      time: d('2026-11-12T09:12:00'),
      student: 'Ergasheva Nilufar',
      amount: 650_000n,
      receipt: 'LG-2026-000506',
    },
    {
      time: d('2026-11-12T10:40:00'),
      student: 'Latipov Doniyor',
      amount: 550_000n,
      receipt: 'LG-2026-000508',
    },
    {
      time: d('2026-11-12T13:05:00'),
      student: 'Karimova Zarina',
      amount: 650_000n,
      receipt: 'LG-2026-000510',
    },
    {
      time: d('2026-11-12T15:20:00'),
      student: 'Saidov Temur',
      amount: 550_000n,
      receipt: 'LG-2026-000511',
    },
    {
      time: d('2026-11-12T16:45:00'),
      student: 'Usmonov Behruz',
      amount: 200_000n,
      receipt: 'LG-2026-000512',
    },
  ],
};

export const PAYMENT: PaymentDetail = {
  receiptNo: 'LG-2026-000418',
  at: d('2026-10-08T12:10:00'),
  student: 'Aliyeva Madina',
  amount: 650_000n,
  method: 'transfer',
  createdBy: 'Aliyev Bahodir (ota-ona, chek)',
  reviewedBy: 'Rahimova Gulnoza',
  verifyUrl: 'https://lg.uz/verify/k7Qm2xP9aT',
  ledger: [{ what: 'Kredit: Oktyabr 2026', amount: 650_000n }],
  enteredToday: false,
};
export const PAYMENT_REVERSED: PaymentDetail = {
  ...PAYMENT,
  reversed: { reason: 'Notoʻgʻri oʻquvchiga kiritilgan' },
  ledger: [...PAYMENT.ledger, { what: 'Storno (teskari yozuv)', amount: -650_000n }],
};

export const DISCOUNTS: DiscountRow[] = [
  {
    id: 'x1',
    student: 'Aliyev Sardor',
    kind: 'percent',
    value: '10%',
    reason: 'Aka-uka chegirmasi',
    by: 'Rahimova Gulnoza',
    status: 'active',
  },
  {
    id: 'x2',
    student: 'Aliyev Sardor',
    kind: 'percent',
    value: '25%',
    reason: 'Aka-uka chegirmasi (oshirish)',
    by: 'Rahimova Gulnoza',
    status: 'pending',
  },
  {
    id: 'x3',
    student: 'Nazarov Islom',
    kind: 'amount',
    value: '100 000 soʻm',
    reason: 'Olimpiada gʻolibi',
    by: 'Bosh Direktor',
    status: 'expired',
  },
];

export const WEB_APPROVALS: WebApproval[] = [
  {
    id: 'a1',
    type: 'discount',
    requestedBy: 'Rahimova Gulnoza',
    reason: 'Ikkinchi farzand ham shu markazda oʻqiydi.',
    details: [
      { label: 'Oʻquvchi', value: 'Aliyev Sardor' },
      { label: 'Chegirma', value: '25% (limit 10%)' },
    ],
    expiresAt: d('2026-11-14T08:00:00'),
  },
  {
    id: 'a2',
    type: 'reversal',
    requestedBy: 'Rahimova Gulnoza',
    reason: 'Toʻlov notoʻgʻri oʻquvchiga kiritilgan.',
    details: [
      { label: 'Chek', value: 'LG-2026-000418' },
      { label: 'Summa', value: '650 000 soʻm' },
    ],
    expiresAt: d('2026-11-13T17:20:00'),
  },
];
