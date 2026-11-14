import { z } from 'zod';

// 1. Revenue Forecast (Tushum prognozi)
export const RevenueForecastItemSchema = z.object({
  month: z.string(), // YYYY-MM
  expected: z.string(), // serialized bigint
  lowerBound: z.string(),
  upperBound: z.string(),
  activeEnrollmentsCount: z.number().int().nonnegative(),
  historicalCollectionRateBp: z.number().int().nonnegative(),
});
export type RevenueForecastItem = z.infer<typeof RevenueForecastItemSchema>;

export const RevenueForecastResponseSchema = z.object({
  items: z.array(RevenueForecastItemSchema),
});
export type RevenueForecastResponse = z.infer<typeof RevenueForecastResponseSchema>;

// 2. Churn Risk (Ketish xavfi, BR-36)
export const ChurnRiskFactorSchema = z.object({
  factor: z.enum(['attendance_drop', 'payment_delay', 'grade_drop', 'bot_unresponsive']),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100),
  reason: z.string(),
});
export type ChurnRiskFactor = z.infer<typeof ChurnRiskFactorSchema>;

export const AtRiskStudentItemSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentCode: z.number().int(),
  groupName: z.string().nullable(),
  churnScore: z.number().int().min(0).max(100),
  isAtRisk: z.boolean(),
  factors: z.array(ChurnRiskFactorSchema),
});
export type AtRiskStudentItem = z.infer<typeof AtRiskStudentItemSchema>;

export const ChurnRiskResponseSchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  atRiskCount: z.number().int().nonnegative(),
  items: z.array(AtRiskStudentItemSchema),
});
export type ChurnRiskResponse = z.infer<typeof ChurnRiskResponseSchema>;

// 3. Group Occupancy (Guruh to'lishi)
export const GroupOccupancyItemSchema = z.object({
  groupId: z.string().uuid(),
  groupName: z.string(),
  capacity: z.number().int().positive(),
  currentActive: z.number().int().nonnegative(),
  occupancyRateBp: z.number().int().nonnegative(),
  projectedChurn: z.number().int().nonnegative(),
  projectedOccupancyRateBp: z.number().int().nonnegative(),
});
export type GroupOccupancyItem = z.infer<typeof GroupOccupancyItemSchema>;

export const GroupOccupancyResponseSchema = z.object({
  items: z.array(GroupOccupancyItemSchema),
});
export type GroupOccupancyResponse = z.infer<typeof GroupOccupancyResponseSchema>;

// 4. Backtest Report (Tarixiy ma'lumotda backtest)
export const BacktestReportResponseSchema = z.object({
  period: z.string(),
  predictedRevenue: z.string(),
  actualRevenue: z.string(),
  errorPercentage: z.number(),
  predictedChurnCount: z.number().int().nonnegative(),
  actualChurnCount: z.number().int().nonnegative(),
});
export type BacktestReportResponse = z.infer<typeof BacktestReportResponseSchema>;
