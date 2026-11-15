import type {
  AnnouncementItem,
  FailedMessageItem,
  ImportHistoryItem,
  ImportPreviewRow,
  TestItem,
  TicketItem,
  TicketMessage,
} from './types.js';
import { at } from './mock-time.js';

export const MOCK_TESTS: readonly TestItem[] = [
  {
    id: 'test-1',
    title: 'Algebra 1-chorak oraliq imtihoni',
    group: 'Algebra-101',
    date: at('2026-10-15'),
    maxScore: 100,
    participants: 18,
    totalStudents: 18,
    avgScore: 82.4,
    status: 'published',
  },
  {
    id: 'test-2',
    title: 'Geometriya starter sinov testi',
    group: 'Geometriya-201',
    date: at('2026-10-22'),
    maxScore: 50,
    participants: 14,
    totalStudents: 15,
    avgScore: 38.5,
    status: 'published',
  },
  {
    id: 'test-3',
    title: 'Fizika mexanika boʻlimi nazorati',
    group: 'Fizika-Olimp',
    date: at('2026-11-05'),
    maxScore: 100,
    participants: 12,
    totalStudents: 12,
    avgScore: 76.0,
    status: 'draft',
  },
];

export const MOCK_IMPORT_HISTORY: readonly ImportHistoryItem[] = [
  {
    id: 'imp-1',
    fileName: 'algebra_101_oraliq.xlsx',
    date: at('2026-10-15 14:30'),
    author: 'Aziz Rahimov (Ustoz)',
    totalRows: 18,
    successCount: 18,
    errorCount: 0,
    status: 'success',
  },
  {
    id: 'imp-2',
    fileName: 'fizika_natijalar_nov.xlsx',
    date: at('2026-11-05 11:20'),
    author: 'Malika Karimova (Admin)',
    totalRows: 15,
    successCount: 13,
    errorCount: 2,
    status: 'warning',
  },
];

export const MOCK_IMPORT_PREVIEW: readonly ImportPreviewRow[] = [
  { studentCode: 'LG-1042', studentName: 'Jasur Saidov', score: 92 },
  { studentCode: 'LG-1043', studentName: 'Madina Ilhomova', score: 85 },
  {
    studentCode: 'LG-1044',
    studentName: 'Olim Boboyev',
    score: 105,
    error: 'Ball maksimaldan oshiq (maks: 100)',
  },
  {
    studentCode: 'LG-9999',
    studentName: 'Farrux Umarov',
    score: 70,
    error: 'Oʻquvchi tizimda topilmadi',
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
