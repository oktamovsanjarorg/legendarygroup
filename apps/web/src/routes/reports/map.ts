import type {
  AttendanceReportResponse,
  DebtAgingResponse,
  LeadsConversionReportResponse,
  RevenueReportResponse,
  TeacherPerformanceReportResponse,
} from '@lg/contracts';
import { formatPeriod } from '@lg/i18n';
import type {
  ReportAgingRow,
  ReportAttendanceRow,
  ReportConversionRow,
  ReportRevenueRow,
  ReportTeacherRow,
} from '../../screens/f3/types.js';
import type { ReportTab } from '../../screens/f3/w26-reports.js';

/** Bazis punkt → foiz (faqat ko'rsatish; hisob serverda). */
export const bp = (v: number): number => v / 100;

/** UI tab → API hisobot turi (`/reports/<type>` va eksport). */
export const REPORT_TYPE: Record<ReportTab, string> = {
  revenue: 'revenue',
  aging: 'debt-aging',
  attendance: 'attendance',
  conversion: 'leads',
  teachers: 'teacher-performance',
};

export const FINANCE_TABS: readonly ReportTab[] = ['revenue', 'aging'];

export const toRevenueRows = (r: RevenueReportResponse): ReportRevenueRow[] =>
  r.items.map((i) => ({
    id: i.id,
    name: /^\d{4}-\d{2}$/.test(i.name) ? formatPeriod(i.name) : i.name,
    students: i.studentCount,
    payments: i.paymentCount,
    revenue: BigInt(i.totalRevenue),
  }));

export const toAgingRows = (r: DebtAgingResponse): ReportAgingRow[] =>
  (['fresh', 'overdue', 'critical'] as const).map((bucket) => ({
    bucket,
    count: r.buckets[bucket].studentCount,
    debt: BigInt(r.buckets[bucket].totalDebt),
  }));

export const toAttendanceRows = (r: AttendanceReportResponse): ReportAttendanceRow[] =>
  r.items.map((i) => ({
    id: i.id,
    name: i.name,
    lessons: i.totalLessons,
    present: i.presentCount + i.lateCount,
    absent: i.absentCount,
    percent: bp(i.attendancePercentBp),
  }));

export const toConversionRows = (r: LeadsConversionReportResponse): ReportConversionRow[] =>
  r.bySource.map((s) => ({
    source: s.source,
    total: s.totalLeads,
    contacted: s.contactedCount,
    trial: s.trialCount,
    won: s.wonCount,
    percent: bp(s.conversionPercentBp),
  }));

export const toTeacherRows = (r: TeacherPerformanceReportResponse): ReportTeacherRow[] =>
  r.items.map((i) => ({
    id: i.teacherId,
    teacher: i.teacherName,
    groups: i.groupCount,
    students: i.studentCount,
    attendancePercent: bp(i.attendancePercentBp),
    retentionPercent: bp(i.retentionPercentBp),
    avgGrade: bp(i.averageGradeScoreBp),
  }));
