import type {
  AnnouncementItem,
  FailedMessageItem,
  ImportRow,
  TestItem,
  TestResultRow,
  TicketItem,
  TicketMessage,
} from './types.js';
import { at } from './mock-time.js';

export const MOCK_TESTS: readonly TestItem[] = [
  { id: 't1', title: 'Oraliq nazorat №1', date: '2026-10-15', maxScore: 100, status: 'published' },
  { id: 't2', title: 'IELTS mock', date: '2026-11-12', maxScore: 9, status: 'draft' },
];

export const MOCK_TEST_RESULTS: readonly TestResultRow[] = [
  { id: 'r1', studentName: 'Jasur Ergashev', studentCode: 1024, score: 86, percent: 86 },
  { id: 'r2', studentName: 'Madina Karimova', studentCode: 1031, score: 74, percent: 74 },
];

export const MOCK_IMPORT_ROWS: readonly ImportRow[] = [
  {
    key: 'm2',
    rowNumber: 2,
    kind: 'matched',
    raw: '1024',
    studentId: 's1',
    studentName: 'Jasur Ergashev',
    score: 86,
    note: null,
  },
  {
    key: 's3',
    rowNumber: 3,
    kind: 'suggested',
    raw: 'Madina Karimovа',
    studentId: 's2',
    studentName: 'Madina Karimova',
    score: 74,
    note: '92%',
  },
  {
    key: 'u4',
    rowNumber: 4,
    kind: 'unmatched',
    raw: 'Noma’lum',
    studentId: null,
    studentName: null,
    score: null,
    note: 'Oʻquvchi topilmadi',
  },
];

export const MOCK_ANNOUNCEMENTS: readonly AnnouncementItem[] = [
  {
    id: 'an-1',
    title: 'Ertaga ochiq dars',
    body: 'Hurmatli ota-onalar, ertaga soat 15:00 da ochiq dars boʻlib oʻtadi.',
    target: 'group',
    targetName: 'MAT-1',
    author: 'Admin',
    date: at('2026-11-14 18:00'),
    status: 'completed',
    total: 14,
    sent: 12,
    failed: 1,
    blocked: 1,
  },
  {
    id: 'an-2',
    title: 'Toʻlov muddati eslatmasi',
    body: 'Iltimos, oʻqish toʻlovini oʻz vaqtida amalga oshiring.',
    target: 'debtors',
    targetName: null,
    author: 'Direktor',
    date: at('2026-11-10 09:00'),
    status: 'completed',
    total: 6,
    sent: 6,
    failed: 0,
    blocked: 0,
  },
];

export const MOCK_TICKETS: readonly TicketItem[] = [
  {
    id: 'tk-1',
    senderName: 'Malika Ergasheva',
    senderPhone: '+998901112233',
    studentName: 'Jasur Ergashev',
    topic: 'Dars jadvali oʻzgarishi',
    status: 'open',
    priority: 'normal',
    assignedName: null,
    lastAt: at('2026-11-15 09:20'),
  },
  {
    id: 'tk-2',
    senderName: 'Rustam Aliyev',
    senderPhone: null,
    studentName: null,
    topic: 'Toʻlov cheki kelmadi',
    status: 'in_progress',
    priority: 'high',
    assignedName: 'Admin',
    lastAt: at('2026-11-14 18:05'),
  },
];

export const MOCK_TICKET_MESSAGES: readonly TicketMessage[] = [
  {
    id: 'm1',
    sender: 'Malika Ergasheva',
    isStaff: false,
    text: 'Ertangi dars soat nechada boʻladi?',
    at: at('2026-11-15 09:20'),
  },
  { id: 'm2', sender: 'Admin', isStaff: true, text: 'Soat 15:00 da.', at: at('2026-11-15 09:40') },
];

export const MOCK_FAILED_MESSAGES: readonly FailedMessageItem[] = [
  {
    id: 'fail-1',
    recipientName: 'Kamola Saidova',
    type: 'billing_reminder',
    reason: 'blocked',
    detail: null,
    attempts: 1,
    date: at('2026-11-14 09:00'),
  },
  {
    id: 'fail-2',
    recipientName: 'Botir Karimov',
    type: 'attendance_absent',
    reason: 'notLinked',
    detail: null,
    attempts: 0,
    date: at('2026-11-15 10:15'),
  },
  {
    id: 'fail-3',
    recipientName: 'Dilnoza Rahimova',
    type: 'announcement',
    reason: 'error',
    detail: 'Telegram 400: Bad Request: chat not found',
    attempts: 8,
    date: at('2026-11-15 11:30'),
  },
];
