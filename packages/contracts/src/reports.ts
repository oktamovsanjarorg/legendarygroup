import { z } from 'zod';

export const REPORT_TYPES = [
  'revenue',
  'debt-aging',
  'attendance',
  'cohort',
  'leads',
  'teacher-performance',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// 1. Revenue Report
export const RevenueReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/)
    .optional(),
  groupBy: z.enum(['month', 'course', 'group', 'teacher']).default('month'),
});
export type RevenueReportQuery = z.infer<typeof RevenueReportQuerySchema>;

export const RevenueReportItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  totalRevenue: z.string(),
  paymentCount: z.number().int().nonnegative(),
  studentCount: z.number().int().nonnegative(),
});
export type RevenueReportItem = z.infer<typeof RevenueReportItemSchema>;

export const RevenueReportResponseSchema = z.object({
  items: z.array(RevenueReportItemSchema),
  totalRevenue: z.string(),
  totalPayments: z.number().int().nonnegative(),
});
export type RevenueReportResponse = z.infer<typeof RevenueReportResponseSchema>;

// 2. Debt Aging Report
export const DebtAgingQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});
export type DebtAgingQuery = z.infer<typeof DebtAgingQuerySchema>;

export const DebtAgingBucketSchema = z.object({
  studentCount: z.number().int().nonnegative(),
  totalDebt: z.string(),
});
export type DebtAgingBucket = z.infer<typeof DebtAgingBucketSchema>;

export const DebtAgingDebtorItemSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentCode: z.number().int(),
  groupName: z.string().nullable(),
  debt: z.string(),
  daysOverdue: z.number().int().nonnegative(),
  bucket: z.enum(['fresh', 'overdue', 'critical']),
});
export type DebtAgingDebtorItem = z.infer<typeof DebtAgingDebtorItemSchema>;

export const DebtAgingResponseSchema = z.object({
  buckets: z.object({
    fresh: DebtAgingBucketSchema,
    overdue: DebtAgingBucketSchema,
    critical: DebtAgingBucketSchema,
  }),
  totalDebt: z.string(),
  totalDebtors: z.number().int().nonnegative(),
  debtors: z.array(DebtAgingDebtorItemSchema),
});
export type DebtAgingResponse = z.infer<typeof DebtAgingResponseSchema>;

// 3. Attendance Report
export const AttendanceReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  groupBy: z.enum(['group', 'teacher']).default('group'),
});
export type AttendanceReportQuery = z.infer<typeof AttendanceReportQuerySchema>;

export const AttendanceReportItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  totalLessons: z.number().int().nonnegative(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  excusedCount: z.number().int().nonnegative(),
  lateCount: z.number().int().nonnegative(),
  attendancePercentBp: z.number().int().nonnegative(),
});
export type AttendanceReportItem = z.infer<typeof AttendanceReportItemSchema>;

export const AttendanceReportResponseSchema = z.object({
  items: z.array(AttendanceReportItemSchema),
  overallAttendancePercentBp: z.number().int().nonnegative(),
});
export type AttendanceReportResponse = z.infer<typeof AttendanceReportResponseSchema>;

// 4. Cohort Analysis Report
export const CohortReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  monthsCount: z.coerce.number().int().min(1).max(24).default(6),
});
export type CohortReportQuery = z.infer<typeof CohortReportQuerySchema>;

export const CohortRetentionPointSchema = z.object({
  monthIndex: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  retentionPercentBp: z.number().int().nonnegative(),
});
export type CohortRetentionPoint = z.infer<typeof CohortRetentionPointSchema>;

export const CohortItemSchema = z.object({
  cohortMonth: z.string(),
  initialCount: z.number().int().nonnegative(),
  retention: z.array(CohortRetentionPointSchema),
});
export type CohortItem = z.infer<typeof CohortItemSchema>;

export const CohortReportResponseSchema = z.object({
  cohorts: z.array(CohortItemSchema),
});
export type CohortReportResponse = z.infer<typeof CohortReportResponseSchema>;

// 5. Leads Conversion Report
export const LeadsConversionReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type LeadsConversionReportQuery = z.infer<typeof LeadsConversionReportQuerySchema>;

export const LeadsConversionSourceItemSchema = z.object({
  source: z.string(),
  totalLeads: z.number().int().nonnegative(),
  contactedCount: z.number().int().nonnegative(),
  trialCount: z.number().int().nonnegative(),
  wonCount: z.number().int().nonnegative(),
  conversionPercentBp: z.number().int().nonnegative(),
});
export type LeadsConversionSourceItem = z.infer<typeof LeadsConversionSourceItemSchema>;

export const LeadsConversionReportResponseSchema = z.object({
  bySource: z.array(LeadsConversionSourceItemSchema),
  totalLeads: z.number().int().nonnegative(),
  totalWon: z.number().int().nonnegative(),
  overallConversionPercentBp: z.number().int().nonnegative(),
});
export type LeadsConversionReportResponse = z.infer<typeof LeadsConversionReportResponseSchema>;

// 6. Teacher Performance Report
export const TeacherPerformanceReportQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type TeacherPerformanceReportQuery = z.infer<typeof TeacherPerformanceReportQuerySchema>;

export const TeacherPerformanceItemSchema = z.object({
  teacherId: z.string().uuid(),
  teacherName: z.string(),
  groupCount: z.number().int().nonnegative(),
  studentCount: z.number().int().nonnegative(),
  attendancePercentBp: z.number().int().nonnegative(),
  retentionPercentBp: z.number().int().nonnegative(),
  averageGradeScoreBp: z.number().int().nonnegative(),
});
export type TeacherPerformanceItem = z.infer<typeof TeacherPerformanceItemSchema>;

export const TeacherPerformanceReportResponseSchema = z.object({
  items: z.array(TeacherPerformanceItemSchema),
});
export type TeacherPerformanceReportResponse = z.infer<
  typeof TeacherPerformanceReportResponseSchema
>;

// 7. Parent Digest (FR-RPT-2 Haftalik, FR-RPT-3 Oylik)
export const ParentDigestQuerySchema = z.object({
  studentId: z.string().uuid(),
  period: z.enum(['weekly', 'monthly']).default('weekly'),
});
export type ParentDigestQuery = z.infer<typeof ParentDigestQuerySchema>;

export const ParentDigestReportSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  periodType: z.enum(['weekly', 'monthly']),
  periodFrom: z.string(),
  periodTo: z.string(),
  totalLessons: z.number().int().nonnegative(),
  attendedLessons: z.number().int().nonnegative(),
  attendanceRatePercent: z.number().min(0).max(100),
  averageGrade: z.number().min(0).max(100),
  comments: z.array(z.string()),
  paymentStatus: z.object({
    status: z.enum(['paid', 'pending', 'overdue']),
    debtAmount: z.string(),
  }),
  testResults: z.array(
    z.object({
      title: z.string(),
      score: z.number(),
      maxScore: z.number(),
      percent: z.number(),
    }),
  ),
  rank: z.number().int().positive().nullable(),
  totalStudents: z.number().int().positive().nullable(),
  miniAppUrl: z.string().optional(),
});
export type ParentDigestReport = z.infer<typeof ParentDigestReportSchema>;
