import type { ApprovalRequest } from './approvals.js';
import type { StaffKpi } from './dashboard.js';
import type { QueueItem } from './review.js';
import type { StudentHit } from './search.js';
import type { Guardian } from './student-card.js';

/** T-017c 4-qism maket ma'lumotlari (MS-*). */
const d = (iso: string) => new Date(`${iso}+05:00`);

/** Chek rasmi o'rnida — mavzuga mos SVG (tashqi so'rovsiz). */
export const RECEIPT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640"><rect width="360" height="640" fill="#f5f7fa"/><rect x="30" y="40" width="300" height="560" rx="16" fill="#fff" stroke="#dde3ea"/><text x="180" y="110" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#1f2a37">Click</text><text x="180" y="190" font-family="sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="#0f9d58">650 000 so'm</text><text x="180" y="240" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#6b7280">12.11.2026 08:29</text><text x="60" y="320" font-family="sans-serif" font-size="15" fill="#6b7280">Qabul qiluvchi</text><text x="60" y="345" font-family="sans-serif" font-size="17" fill="#1f2a37">8600 **** **** 9012</text><text x="60" y="400" font-family="sans-serif" font-size="15" fill="#6b7280">Holat</text><text x="60" y="425" font-family="sans-serif" font-size="17" fill="#0f9d58">Muvaffaqiyatli</text></svg>`,
)}`;

export const KPI: StaffKpi = {
  revenue: 4_550_000n,
  revenueYesterday: 3_900_000n,
  attendancePercent: 91,
  unmarkedLessons: 1,
  absentToday: 6,
  queue: 3,
  approvals: 2,
};

export const QUEUE: QueueItem[] = [
  {
    id: 'q1',
    imageUrl: RECEIPT_SVG,
    studentName: 'Aliyeva Madina',
    groupName: 'IELTS 7.0 — B2-guruh',
    guardianName: 'Aliyev Bahodir',
    amount: 650_000n,
    comment: 'Noyabr uchun',
    sentAt: d('2026-11-12T08:31:00'),
  },
  {
    id: 'q2',
    imageUrl: RECEIPT_SVG,
    studentName: 'Boboyev Sardor',
    groupName: 'Matematika — A1',
    guardianName: 'Boboyeva Nodira',
    amount: 650_000n,
    sentAt: d('2026-11-12T09:02:00'),
    duplicateOf: { sentAt: d('2026-11-12T08:55:00'), amount: 650_000n },
  },
];

export const APPROVALS: ApprovalRequest[] = [
  {
    id: 'a1',
    type: 'discount',
    requestedBy: 'Admin: Rahimova Gulnoza',
    reason: 'Aka-uka chegirmasi: ikkinchi farzand ham shu markazda oʻqiydi.',
    details: [
      { label: 'Oʻquvchi', value: 'Aliyev Sardor' },
      { label: 'Chegirma', value: '25% (limit 10%)' },
      { label: 'Oyiga', value: '−162 500 soʻm' },
    ],
    expiresAt: d('2026-11-14T08:00:00'),
  },
  {
    id: 'a2',
    type: 'reversal',
    requestedBy: 'Admin: Rahimova Gulnoza',
    reason: 'Toʻlov notoʻgʻri oʻquvchiga kiritilgan.',
    details: [
      { label: 'Chek', value: 'LG-2026-000498' },
      { label: 'Summa', value: '650 000 soʻm' },
    ],
    expiresAt: d('2026-11-13T17:20:00'),
  },
];

export const STUDENTS: StudentHit[] = [
  {
    id: 's1',
    code: 'LG-1042',
    name: 'Aliyeva Madina',
    phone: '+998901234567',
    groups: ['IELTS 7.0 — B2-guruh'],
    debt: 650_000n,
  },
  {
    id: 's2',
    code: 'LG-1043',
    name: 'Aliyev Sardor',
    phone: '+998901234567',
    groups: ['IELTS 6.0 — B1'],
    debt: 0n,
  },
  {
    id: 's3',
    code: 'LG-0877',
    name: 'Oʻrinboyeva Malika',
    phone: '+998935550011',
    groups: ['Matematika — A1', 'IELTS 6.0 — B1'],
    debt: 0n,
  },
  {
    id: 's4',
    code: 'LG-0912',
    name: 'Gʻaniyeva Shahzoda',
    phone: '+998977001122',
    groups: ['Matematika — A3'],
    debt: 1_300_000n,
  },
];

export const GUARDIANS: Guardian[] = [
  { name: 'Aliyev Bahodir', relation: 'Otasi', phone: '+998901234567', telegramLinked: true },
  { name: 'Aliyeva Dilnoza', relation: 'Onasi', phone: '+998909876543', telegramLinked: false },
];
