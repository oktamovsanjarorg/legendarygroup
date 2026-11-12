import type {
  AuditLogItem,
  ChurnStudentItem,
  ForecastRevenue,
  LandingCourseItem,
  ReportAgingRow,
  ReportAttendanceRow,
  ReportConversionRow,
  ReportRevenueRow,
  ReportTeacherRow,
  StaffActivityItem,
  SuspiciousActivityItem,
} from './types.js';

// W-26: Hisobotlar (faqat markaz kurslari: Matematika 550 000 soʻm, Ingliz tili 650 000 soʻm; jami ~186 oʻquvchi, ~78m tushum)
export const MOCK_REPORT_REVENUE: readonly ReportRevenueRow[] = [
  {
    course: 'Matematika',
    studentsCount: 88,
    revenue: 48_400_000n, // 88 * 550_000n
    sharePercent: 62,
  },
  {
    course: 'Ingliz tili (IELTS)',
    studentsCount: 46,
    revenue: 29_900_000n, // 46 * 650_000n
    sharePercent: 38,
  },
];

export const MOCK_REPORT_AGING: readonly ReportAgingRow[] = [
  { interval: '0–7 kun (yangi)', count: 24, debtAmount: 18_200_000n, sharePercent: 45 },
  { interval: '8–15 kun', count: 12, debtAmount: 11_400_000n, sharePercent: 28 },
  { interval: '16–30 kun', count: 6, debtAmount: 6_800_000n, sharePercent: 17 },
  { interval: '30+ kun (kritik)', count: 3, debtAmount: 4_100_000n, sharePercent: 10 },
];

export const MOCK_REPORT_ATTENDANCE: readonly ReportAttendanceRow[] = [
  {
    course: 'Matematika',
    teacher: 'Aziz Rahimov',
    attendancePercent: 93,
    retentionPercent: 95,
  },
  {
    course: 'Ingliz tili (IELTS)',
    teacher: 'Nilufar Yusupova',
    attendancePercent: 90,
    retentionPercent: 92,
  },
];

export const MOCK_REPORT_CONVERSION: readonly ReportConversionRow[] = [
  { stage: 'Yangi lidlar (Ariza)', count: 180, percent: 100 },
  { stage: 'Bogʻlanilgan lidlar', count: 154, percent: 85 },
  { stage: 'Sinov darsiga qatnashgan', count: 112, percent: 62 },
  { stage: 'Toʻlov qilib oʻqishni boshlagan', count: 86, percent: 48 },
];

export const MOCK_REPORT_TEACHERS: readonly ReportTeacherRow[] = [
  {
    teacher: 'Aziz Rahimov',
    groupsCount: 4,
    studentsCount: 52,
    attendancePercent: 94,
    avgGrade: 4.6,
  },
  {
    teacher: 'Nilufar Yusupova',
    groupsCount: 3,
    studentsCount: 46,
    attendancePercent: 90,
    avgGrade: 4.3,
  },
  {
    teacher: 'Jamshid Qodirov',
    groupsCount: 3,
    studentsCount: 36,
    attendancePercent: 91,
    avgGrade: 4.4,
  },
];

// W-27: Prognozlar
export const MOCK_FORECAST_REVENUE: ForecastRevenue = {
  conservative: 74_000_000n,
  expected: 82_000_000n,
  optimistic: 90_000_000n,
};

export const MOCK_CHURN_STUDENTS: readonly ChurnStudentItem[] = [
  {
    id: 'ch-1',
    name: 'Sirojiddin Alimov',
    group: 'Matematika-101',
    riskScore: 84,
    reasons: ['Davomat 42% ga tushgan', 'Toʻlov 14 kun kechikkan', 'Baho 4.5 dan 2.9 ga pasaygan'],
    guardianName: 'Gulnora Alimova',
    guardianPhone: '+998 90 555 44 33',
    debt: 550_000n,
  },
  {
    id: 'ch-2',
    name: 'Diyorbek Karimov',
    group: 'Ingliz-tili-201',
    riskScore: 68,
    reasons: ['Bot xabarlari bloklangan', 'Oxirgi 3 ta darsga qatnashmagan'],
    guardianName: 'Rustam Karimov',
    guardianPhone: '+998 93 111 22 33',
    debt: 650_000n,
  },
];

// W-30: Audit
export const MOCK_AUDIT_LOGS: readonly AuditLogItem[] = [
  {
    id: 'aud-1',
    timestamp: '2026-11-12 11:45:22',
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
    timestamp: '2026-11-12 10:15:08',
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
    timestamp: '2026-11-12 09:00:15',
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
    timestamp: '2026-11-11 23:42',
    userName: 'Nomaʼlum sessiya',
  },
  {
    id: 'susp-2',
    title: 'Davomatni kechikib oʻzgartirish (5 kun oʻtib)',
    description:
      '7-noyabrdagi dars davomatida 2 nafar oʻquvchi holati «kelmadi»dan «keldi»ga oʻzgartirilgan.',
    riskLevel: 'medium',
    timestamp: '2026-11-12 08:30',
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
