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

// W-26: Hisobotlar (API: /reports/*). Foizlar — bazis punktdan, faqat ko'rsatish.
export interface ReportRevenueRow {
  id: string;
  name: string;
  students: number;
  payments: number;
  revenue: bigint;
}

export type ReportAgingBucket = 'fresh' | 'overdue' | 'critical';
export interface ReportAgingRow {
  bucket: ReportAgingBucket;
  count: number;
  debt: bigint;
}

export interface ReportAttendanceRow {
  id: string;
  name: string;
  lessons: number;
  present: number;
  absent: number;
  percent: number;
}

export interface ReportConversionRow {
  source: string;
  total: number;
  contacted: number;
  trial: number;
  won: number;
  percent: number;
}

export interface ReportTeacherRow {
  id: string;
  teacher: string;
  groups: number;
  students: number;
  attendancePercent: number;
  retentionPercent: number;
  /** Baho qo'yilmagan — `null`. */
  avgGrade: number | null;
}

/** KPI — server yigʻindilari; ruxsat yoʻq boʻlsa `null`. */
export interface ReportKpi {
  revenue: bigint | null;
  attendancePercent: number | null;
  debtors: number | null;
  conversionPercent: number | null;
}

// W-27: Prognozlar (API: /forecasts/*). Pul — bigint, hisob serverda.
export interface ForecastMonth {
  month: string;
  lower: bigint;
  expected: bigint;
  upper: bigint;
}

export type ChurnFactor = 'attendance_drop' | 'payment_delay' | 'grade_drop' | 'bot_unresponsive';

export interface ChurnStudentItem {
  id: string;
  name: string;
  group: string | null;
  riskScore: number;
  /** Ball qo'shgan omillar (eng kattasi birinchi). */
  factors: readonly { factor: ChurnFactor; score: number }[];
}

export interface OccupancyItem {
  id: string;
  group: string;
  capacity: number;
  active: number;
  occupancyPercent: number;
  projectedChurn: number;
  projectedPercent: number;
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
