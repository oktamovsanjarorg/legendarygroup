import type {
  AnnouncementItem,
  AnnouncementStats,
  AuditLogItem,
  LeadDto,
  LessonDto,
  StaffActivityItem,
  SuspiciousActivityItem,
  UndeliveredNotificationItem,
} from '@lg/contracts';

/** Storybook va testlar uchun namuna (MS-09, MS-15, MS-26, MS-33). */
export const lead: LeadDto = {
  id: 'l1',
  fullName: 'Rahimova Malika',
  phone: '+998901234567',
  course: { id: 'c1', name: 'Ingliz tili' },
  source: 'website',
  status: 'new',
  assignedTo: null,
  notes: 'Kechki guruh kerak',
  lostReason: null,
  trial: null,
  studentId: null,
  statusChangedAt: '2026-11-24T08:00:00.000Z',
  createdAt: '2026-11-24T08:00:00.000Z',
};

export const lesson: LessonDto = {
  id: 'les1',
  group: { id: 'g1', name: 'IELTS A1' },
  date: '2026-11-26',
  startTime: '15:00',
  endTime: '16:20',
  room: { id: 'r1', name: '2-xona' },
  teacher: { id: 't1', name: 'Karimov Anvar' },
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

export const undeliveredItem: UndeliveredNotificationItem = {
  id: 'n1',
  userId: 'u1',
  userName: 'Aliyeva Nodira',
  recipient: '555',
  phone: '+998901234567',
  retryable: true,
  body: 'Toʻlov muddati oʻtdi',
  type: 'billing_reminder',
  status: 'blocked',
  failedReason: 'Forbidden',
  attempts: 1,
  createdAt: '2026-11-24T06:00:00.000Z',
};

export const announcement: AnnouncementItem = {
  id: 'a1',
  branchId: 'b1',
  authorId: 'u1',
  authorName: 'Karimova Dilnoza',
  title: 'Ochiq dars',
  body: 'Ertaga 15:00 da ochiq dars boʻladi.',
  targetType: 'group',
  targetId: 'g1',
  fileId: null,
  fileType: null,
  status: 'completed',
  totalRecipients: 12,
  sentCount: 10,
  failedCount: 1,
  blockedCount: 1,
  sentAt: '2026-11-24T06:00:00.000Z',
  createdAt: '2026-11-24T06:00:00.000Z',
};

export const annStats: AnnouncementStats = {
  id: 'a1',
  title: 'Ochiq dars',
  status: 'completed',
  totalRecipients: 2,
  queuedCount: 0,
  sentCount: 1,
  failedCount: 0,
  blockedCount: 1,
  recipients: [
    {
      id: 'r1',
      userId: 'u1',
      recipientName: 'Aliyeva Nodira',
      recipientPhone: '+998901234567',
      channel: 'telegram',
      status: 'sent',
      sentAt: '2026-11-24T06:00:00.000Z',
      failedReason: null,
    },
    {
      id: 'r2',
      userId: 'u2',
      recipientName: 'Valiyev Akrom',
      recipientPhone: '+998901230001',
      channel: 'telegram',
      status: 'blocked',
      sentAt: null,
      failedReason: 'Forbidden',
    },
  ],
};

export const auditItem: AuditLogItem = {
  id: 'x1',
  timestamp: '2026-11-24T09:00:00.000Z',
  actorId: 'u1',
  userName: 'Karimova Dilnoza',
  userRole: 'admin',
  action: 'billing.discount.set',
  entity: 'enrollment',
  entityId: 'e1',
  target: 'enrollment:e1',
  ip: '10.0.0.1',
  userAgent: 'Telegram',
  diff: [{ field: 'discountPercent', before: null, after: 10 }],
};

export const suspicious: SuspiciousActivityItem = {
  id: 'x2',
  title: 'Toʻlov bekor qilindi (storno)',
  description: '',
  riskLevel: 'high',
  timestamp: '2026-11-24T09:00:00.000Z',
  userName: 'Karimova Dilnoza',
  actorId: 'u1',
  action: 'billing.payment.reverse',
  entity: 'payment',
  entityId: 'p1',
};

export const activity: StaffActivityItem = {
  staffId: 'u1',
  staffName: 'Karimova Dilnoza',
  role: 'admin',
  paymentsCount: 42,
  approvalsCount: 3,
  avgResponseTimeMinutes: 25,
  avgResponseTimeFormatted: '25 daq',
};
