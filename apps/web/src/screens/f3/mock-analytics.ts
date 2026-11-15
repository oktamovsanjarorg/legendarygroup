import type {
  AuditLogItem,
  ChurnStudentItem,
  ForecastMonth,
  LandingCourseItem,
  OccupancyItem,
  ReportAgingRow,
  ReportAttendanceRow,
  ReportConversionRow,
  ReportKpi,
  ReportRevenueRow,
  ReportTeacherRow,
  StaffActivityItem,
  SuspiciousActivityItem,
} from './types.js';
import { at } from './mock-time.js';

// W-26: Hisobotlar — faqat markaz kurslari (Matematika 550 000, Ingliz tili 650 000 soʻm);
// toʻlagan oʻquvchilar × narx = tushum (~78 mln, W-04 bilan mos). Faqat Storybook.
export const MOCK_REPORT_REVENUE: readonly ReportRevenueRow[] = [
  { id: 'c1', name: 'Matematika', students: 88, payments: 88, revenue: 48_400_000n },
  { id: 'c2', name: 'Ingliz tili (IELTS)', students: 46, payments: 46, revenue: 29_900_000n },
];

export const MOCK_REPORT_AGING: readonly ReportAgingRow[] = [
  { bucket: 'fresh', count: 24, debt: 18_200_000n },
  { bucket: 'overdue', count: 18, debt: 18_200_000n },
  { bucket: 'critical', count: 4, debt: 4_100_000n },
];

export const MOCK_REPORT_ATTENDANCE: readonly ReportAttendanceRow[] = [
  { id: 'g1', name: 'MAT-1', lessons: 12, present: 130, absent: 14, percent: 90.3 },
  { id: 'g2', name: 'IELTS-2', lessons: 12, present: 104, absent: 4, percent: 96.3 },
];

export const MOCK_REPORT_CONVERSION: readonly ReportConversionRow[] = [
  { source: 'instagram', total: 120, contacted: 104, trial: 76, won: 58, percent: 48.3 },
  { source: 'telegram', total: 60, contacted: 50, trial: 36, won: 28, percent: 46.7 },
];

export const MOCK_REPORT_TEACHERS: readonly ReportTeacherRow[] = [
  {
    id: 't1',
    teacher: 'Aziz Rahimov',
    groups: 4,
    students: 52,
    attendancePercent: 92.4,
    retentionPercent: 95,
    avgGrade: 82.5,
  },
];

export const MOCK_REPORT_KPI: ReportKpi = {
  revenue: 78_300_000n,
  attendancePercent: 91.8,
  debtors: 46,
  conversionPercent: 47.8,
};

// W-27: Prognozlar — faqat Storybook.
export const MOCK_FORECAST_MONTHS: readonly ForecastMonth[] = [
  { month: '2026-12', lower: 66_500_000n, expected: 70_000_000n, upper: 73_500_000n },
  { month: '2027-01', lower: 63_000_000n, expected: 70_000_000n, upper: 77_000_000n },
  { month: '2027-02', lower: 59_500_000n, expected: 70_000_000n, upper: 80_500_000n },
];

export const MOCK_CHURN_STUDENTS: readonly ChurnStudentItem[] = [
  {
    id: 's1',
    name: 'Jasur Aliyev',
    group: 'MAT-1',
    riskScore: 82,
    factors: [
      { factor: 'attendance_drop', score: 32 },
      { factor: 'payment_delay', score: 30 },
      { factor: 'grade_drop', score: 10 },
      { factor: 'bot_unresponsive', score: 10 },
    ],
  },
  {
    id: 's2',
    name: 'Madina Karimova',
    group: 'IELTS-2',
    riskScore: 64,
    factors: [
      { factor: 'payment_delay', score: 30 },
      { factor: 'attendance_drop', score: 24 },
      { factor: 'bot_unresponsive', score: 10 },
    ],
  },
];

export const MOCK_OCCUPANCY: readonly OccupancyItem[] = [
  {
    id: 'g1',
    group: 'MAT-1',
    capacity: 15,
    active: 13,
    occupancyPercent: 86.67,
    projectedChurn: 1,
    projectedPercent: 80,
  },
];

export const MOCK_AUDIT_LOGS: readonly AuditLogItem[] = [
  {
    id: 'aud-1',
    timestamp: at('2026-11-12 11:45:22'),
    userName: 'Malika Karimova',
    userRole: 'Administrator',
    module: 'finance',
    action: 'update',
    target: 'Toʻlov cheki #CHK-8812',
    ip: '192.168.1.45 (Admin PC)',
    diff: [
      { field: 'holat', before: 'Kutilmoqda', after: 'Tasdiqlandi' },
      { field: 'tasdiqlagan_summa', before: '0 soʻm', after: '1 200 000 soʻm' },
    ],
  },
  {
    id: 'aud-2',
    timestamp: at('2026-11-12 10:15:08'),
    userName: 'Sardor Aliyev',
    userRole: 'Direktor',
    module: 'students',
    action: 'update',
    target: 'Oʻquvchi: Jasur Saidov (LG-1042)',
    ip: '192.168.1.10 (Director Mac)',
    diff: [{ field: 'chegirma', before: '0%', after: '15%' }],
  },
  {
    id: 'aud-3',
    timestamp: at('2026-11-12 09:00:15'),
    userName: 'Aziz Rahimov',
    userRole: 'Ustoz',
    module: 'attendance',
    action: 'create',
    target: 'Davomat: Algebra-101 (12-noyabr)',
    ip: '192.168.1.88 (Mobile Chrome)',
  },
];

export const MOCK_SUSPICIOUS_ACTIVITIES: readonly SuspiciousActivityItem[] = [
  {
    id: 'susp-1',
    title: 'Tungi vaqtda tizimga kirish (23:42)',
    description:
      'Xodim hisobi orqali noaniq IP-manzildan (46.227.12.8) kassa sahifasiga kirish amalga oshirilgan.',
    riskLevel: 'high',
    timestamp: at('2026-11-11 23:42'),
    userName: 'Nomaʼlum sessiya',
  },
  {
    id: 'susp-2',
    title: 'Davomatni kechikib oʻzgartirish (5 kun oʻtib)',
    description:
      '7-noyabrdagi dars davomatida 2 nafar oʻquvchi holati «kelmadi»dan «keldi»ga oʻzgartirilgan.',
    riskLevel: 'medium',
    timestamp: at('2026-11-12 08:30'),
    userName: 'Aziz Rahimov',
  },
];

export const MOCK_STAFF_ACTIVITIES: readonly StaffActivityItem[] = [
  {
    staffName: 'Malika Karimova',
    role: 'Bosh administrator',
    paymentsCount: 142,
    approvalsCount: 88,
    avgResponseTime: '4 daqiqa',
  },
  {
    staffName: 'Aziz Rahimov',
    role: 'Katta ustoz',
    paymentsCount: 0,
    approvalsCount: 42,
    avgResponseTime: '12 daqiqa',
  },
  {
    staffName: 'Sardor Aliyev',
    role: 'Direktor',
    paymentsCount: 18,
    approvalsCount: 65,
    avgResponseTime: '18 daqiqa',
  },
];

// W-35: Landing kurslari (markaz kurslari: Matematika 550 000 soʻm, Ingliz tili 650 000 soʻm)
export const MOCK_LANDING_COURSES: readonly LandingCourseItem[] = [
  {
    id: 'crs-1',
    title: 'Chuqurlashtirilgan matematika',
    description:
      'Prezident maktablari va litseylarga tayyorgarlik, mantiqiy fikrlash va olimpiada masalalari.',
    durationMonths: 9,
    pricePerMonth: 550_000n,
    popular: true,
  },
  {
    id: 'crs-2',
    title: 'IELTS va akademik ingliz tili',
    description:
      'Natijaga yoʻnaltirilgan intensiv ingliz tili darslari (maqsad 7.0+). Mock imtihonlar bepul.',
    durationMonths: 6,
    pricePerMonth: 650_000n,
    popular: true,
  },
];
