import type {
  AnnouncementItem,
  FailedMessageItem,
  ImportHistoryItem,
  ImportPreviewRow,
  TestItem,
  TicketItem,
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
    id: 'ann-1',
    title: 'Kuzgi taʼtil kunlari dars jadvali',
    content:
      'Hurmatli ota-onalar va oʻquvchilar! 4–10-noyabr kunlari barcha guruhlarda darslar odatiy jadval asosida davom etadi. Qoʻshimcha savollar boʻlsa maʼmuriyatga murojaat qiling.',
    target: 'all',
    date: at('2026-11-02 10:00'),
    author: 'Sardor Aliyev (Direktor)',
    sentCount: 340,
    deliveredCount: 334,
    failedCount: 6,
    readCount: 298,
  },
  {
    id: 'ann-2',
    title: 'Algebra-101 uchun qoʻshimcha amaliy dars',
    content:
      'Yakshanba kuni soat 10:00 da 3-xonada tenglamalar mavzusiga bagʻishlangan bepul master-klass oʻtkaziladi.',
    target: 'groups',
    groupName: 'Algebra-101',
    date: at('2026-11-08 16:45'),
    author: 'Aziz Rahimov (Ustoz)',
    sentCount: 18,
    deliveredCount: 18,
    failedCount: 0,
    readCount: 16,
  },
];

export const MOCK_TICKETS: readonly TicketItem[] = [
  {
    id: 'TCK-201',
    senderName: 'Dilfuza Rahimova',
    senderPhone: '+998 90 123 45 67',
    studentName: 'Jasur Saidov',
    groupName: 'Algebra-101',
    topic: 'Toʻlov cheki boʻyicha savol',
    status: 'open',
    priority: 'urgent',
    date: at('2026-11-12 11:20'),
    messages: [
      {
        id: 'm1',
        sender: 'Dilfuza Rahimova',
        isStaff: false,
        text: 'Assalomu alaykum! Kecha Click orqali toʻlov qilgandim, botda hali ham qarz koʻrinyapti. Tekshirib bera olasizmi?',
        time: '11:20',
      },
    ],
  },
  {
    id: 'TCK-202',
    senderName: 'Botir Temirov',
    senderPhone: '+998 93 456 78 90',
    studentName: 'Madina Temirova',
    groupName: 'Geometriya-201',
    topic: 'Kasallik sababli dars qoldirish',
    status: 'inProgress',
    priority: 'normal',
    date: at('2026-11-11 15:40'),
    messages: [
      {
        id: 'm2',
        sender: 'Botir Temirov',
        isStaff: false,
        text: 'Farzandim shamollab qoldi, bu haftadagi darslarga qatnasha olmaydi.',
        time: '15:40',
      },
      {
        id: 'm3',
        sender: 'Administrator',
        isStaff: true,
        text: 'Salomat boʻlsin! Davomatda sababli deb belgiladik. Topshiriqlarni bot orqali yetkazamiz.',
        time: '16:05',
      },
    ],
  },
];

export const MOCK_FAILED_MESSAGES: readonly FailedMessageItem[] = [
  {
    id: 'fail-1',
    recipientName: 'Kamola Saidova',
    recipientPhone: '+998 91 234 56 78',
    studentName: 'Jasur Saidov',
    groupName: 'Algebra-101',
    type: 'paymentReminder',
    reason: 'TelegramChatBlocked',
    attempts: 3,
    date: at('2026-11-12 09:30'),
  },
  {
    id: 'fail-2',
    recipientName: 'Alisher Vohidov',
    recipientPhone: '+998 97 765 43 21',
    studentName: 'Nodira Vohidova',
    groupName: 'Fizika-Olimp',
    type: 'lessonCancel',
    reason: 'UserNotFound',
    attempts: 2,
    date: at('2026-11-11 18:15'),
  },
  {
    id: 'fail-3',
    recipientName: 'Guli Ergasheva',
    recipientPhone: '+998 94 333 22 11',
    studentName: 'Bekzod Ergashev',
    groupName: 'Geometriya-201',
    type: 'attendanceAlert',
    reason: 'NetworkError',
    attempts: 1,
    date: at('2026-11-12 10:05'),
  },
];
