/** F3 web ekranlari ko'rinish modellari (maket; W-19…W-27, W-30, W-35). */

// W-19: Testlar
export interface TestItem {
  id: string;
  title: string;
  group: string;
  date: Date;
  maxScore: number;
  participants: number;
  totalStudents: number;
  avgScore: number;
  status: 'published' | 'draft';
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  date: Date;
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
  date: Date;
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
  date: Date;
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
  date: Date;
}

// W-23: Xarajatlar
/** FR-FIN-1 kategoriyalari — API bilan bir xil (`@lg/contracts`). */
export type { ExpenseCategory } from '@lg/contracts';
import type { ExpenseCategory } from '@lg/contracts';

export interface ExpenseItem {
  id: string;
  date: Date;
  category: ExpenseCategory;
  description: string;
  amount: bigint;
  /** Chek fayli bor (FR-FIN-1). */
  hasReceipt: boolean;
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

// W-25: Oyliklar (hisob bir butun: qoralama → tasdiqlangan → to'langan, BR-27)
export type PayrollStatus = 'draft' | 'approved' | 'paid';
export type PayrollLineKind =
  'fixed' | 'percent' | 'per_lesson' | 'bonus' | 'penalty' | 'advance' | 'adjustment';

export interface PayrollRow {
  id: string;
  staffName: string;
  /** Server yig'indilari (UI pul qo'shmaydi). */
  earned: bigint;
  extras: bigint;
  advances: bigint;
  total: bigint;
  lines: readonly { kind: PayrollLineKind; amount: bigint; note: string | null }[];
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
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'other';

export interface AuditDiffItem {
  field: string;
  before: string;
  after: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: Date;
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
  timestamp: Date;
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
