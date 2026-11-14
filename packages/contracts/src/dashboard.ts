import { z } from 'zod';

export const DashboardDailyRevenueSchema = z.object({
  day: z.number().int().min(1).max(31),
  amount: z.string().regex(/^\d+$/),
});
export type DashboardDailyRevenue = z.infer<typeof DashboardDailyRevenueSchema>;

export const DashboardTodayLessonSchema = z.object({
  id: z.string().uuid(),
  start: z.string(), // "14:00"
  group: z.string(),
  teacher: z.string(),
  room: z.string(),
});
export type DashboardTodayLesson = z.infer<typeof DashboardTodayLessonSchema>;

export const DirectorDashboardKpiSchema = z.object({
  revenueMonth: z.string().regex(/^\d+$/),
  revenueDelta: z.number(), // o'tgan oyga nisbatan foiz, masalan +12 yoki -5
  revenueToday: z.string().regex(/^\d+$/),
  revenueYesterday: z.string().regex(/^\d+$/),
  debtTotal: z.string().regex(/^\d+$/),
  activeStudents: z.number().int().min(0),
  attendance: z.number().int().min(0).max(100),
  queue: z.number().int().min(0),
  unmarked: z.number().int().min(0),
  joined: z.number().int().min(0),
  left: z.number().int().min(0),
  approvals: z.number().int().min(0),
  daily: z.array(DashboardDailyRevenueSchema),
  todayLessons: z.array(DashboardTodayLessonSchema),
  cachedAt: z.string(),
});
export type DirectorDashboardKpi = z.infer<typeof DirectorDashboardKpiSchema>;
