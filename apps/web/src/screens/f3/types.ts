/** F3 web ekranlari ko'rinish modellari (maket; W-19…W-27, W-30, W-35). */

// W-19: Testlar
export interface TestItem {
  id: string;
  title: string;
  group: string;
  date: string;
  maxScore: number;
  participants: number;
  totalStudents: number;
  avgScore: number;
  status: 'published' | 'draft';
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  date: string;
  author: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: 'success' | 'warning';
}

export interface ImportPreviewRow {
  studentCode: string;
  studentName: string;
  score: number;
  notes?: string;
  error?: string;
}

// W-20: E'lonlar
export type AnnouncementAudience = 'all' | 'groups' | 'debtors' | 'teachers';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  target: AnnouncementAudience;
  groupName?: string;
  date: string;
  author: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
}

// W-21: Murojaatlar
export type TicketPriority = 'normal' | 'urgent';
export type TicketStatus = 'open' | 'inProgress' | 'closed';

export interface TicketMessage {
  id: string;
  sender: string;
  isStaff: boolean;
  text: string;
  time: string;
}

export interface TicketItem {
  id: string;
  senderName: string;
  senderPhone: string;
  studentName: string;
  groupName: string;
  topic: string;
  status: TicketStatus;
  priority: TicketPriority;
  date: string;
  messages: readonly TicketMessage[];
}

// W-22: Yetib bormagan xabarlar
export type FailedMessageType =
  'paymentReminder' | 'lessonCancel' | 'announcement' | 'attendanceAlert';
export type FailedMessageReason =
  'TelegramChatBlocked' | 'UserNotFound' | 'NetworkError' | 'RateLimit';

export interface FailedMessageItem {
  id: string;
  recipientName: string;
  recipientPhone: string;
  studentName: string;
  groupName: string;
  type: FailedMessageType;
  reason: FailedMessageReason;
  attempts: number;
  date: string;
}

// W-23: Xarajatlar
export type ExpenseCategory =
  'rent' | 'utilities' | 'marketing' | 'salary' | 'supplies' | 'equipment' | 'other';
export type ExpenseMethod = 'cash' | 'bank' | 'card';

export interface ExpenseItem {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: bigint;
  method: ExpenseMethod;
  receiptUrl?: string;
  author: string;
}

// W-24: P&L
export interface PnlMonthRow {
  month: string;
  revenue: bigint;
  payroll: bigint;
  operational: bigint;
  totalExpenses: bigint;
  netProfit: bigint;
  marginPercent: number;
}

// W-25: Oyliklar
export type PayrollContractType = 'fixed' | 'percent' | 'mixed' | 'hourly';
export type PayrollStatus = 'draft' | 'approved' | 'paid';

export interface PayrollItem {
  id: string;
  staffName: string;
  role: string;
  contractType: PayrollContractType;
  baseAmount: bigint;
  bonus: bigint;
  advance: bigint;
  total: bigint;
  status: PayrollStatus;
  details: {
    lessonsCount: number;
    studentsCount: number;
    formula: string;
    groupBreakdowns: readonly { group: string; amount: bigint }[];
  };
}

// W-26: Hisobotlar
export interface ReportRevenueRow {
  course: string;
  studentsCount: number;
  revenue: bigint;
  sharePercent: number;
}

export interface ReportAgingRow {
  interval: string;
  count: number;
  debtAmount: bigint;
  sharePercent: number;
}

export interface ReportAttendanceRow {
  course: string;
  teacher: string;
  attendancePercent: number;
  retentionPercent: number;
}

export interface ReportConversionRow {
  stage: string;
  count: number;
  percent: number;
}

export interface ReportTeacherRow {
  teacher: string;
  groupsCount: number;
  studentsCount: number;
  attendancePercent: number;
  avgGrade: number;
}

// W-27: Prognozlar
export interface ForecastRevenue {
  conservative: bigint;
  expected: bigint;
  optimistic: bigint;
}

export interface ChurnStudentItem {
  id: string;
  name: string;
  group: string;
  riskScore: number;
  reasons: readonly string[];
  guardianName: string;
  guardianPhone: string;
  debt: bigint;
}

// W-30: Audit
export type AuditModule = 'finance' | 'students' | 'attendance' | 'system';
export type AuditAction = 'create' | 'update' | 'delete' | 'login';

export interface AuditDiffItem {
  field: string;
  before: string;
  after: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  module: AuditModule;
  action: AuditAction;
  target: string;
  ip: string;
  diff?: readonly AuditDiffItem[];
}

export interface SuspiciousActivityItem {
  id: string;
  title: string;
  description: string;
  riskLevel: 'high' | 'medium';
  timestamp: string;
  userName: string;
}

export interface StaffActivityItem {
  staffName: string;
  role: string;
  paymentsCount: number;
  approvalsCount: number;
  avgResponseTime: string;
}

// W-35: Landing
export interface LandingCourseItem {
  id: string;
  title: string;
  description: string;
  durationMonths: number;
  pricePerMonth: bigint;
  popular?: boolean;
}
