import type {
  AttendanceReportResponse,
  DebtAgingResponse,
  RevenueReportResponse,
} from '@lg/contracts';
import type { Forecasts } from '../../data/staff-reports.js';

export const revenueReport: RevenueReportResponse = {
  items: [
    {
      id: '2026-11',
      name: '2026-11',
      totalRevenue: '42500000',
      paymentCount: 96,
      studentCount: 90,
    },
    { id: 'unassigned', name: '', totalRevenue: '-150000', paymentCount: 0, studentCount: 0 },
  ],
  totalRevenue: '42350000',
  totalPayments: 96,
};

export const debtReport: DebtAgingResponse = {
  buckets: {
    fresh: { studentCount: 1, totalDebt: '400000' },
    overdue: { studentCount: 0, totalDebt: '0' },
    critical: { studentCount: 1, totalDebt: '800000' },
  },
  totalDebt: '1200000',
  totalDebtors: 2,
  debtors: [
    {
      studentId: 's1',
      studentName: 'Karimov Ali',
      studentCode: 101,
      groupName: 'MATH-01',
      debt: '400000',
      daysOverdue: 0,
      bucket: 'fresh',
    },
    {
      studentId: 's2',
      studentName: 'Soliyeva Lola',
      studentCode: 102,
      groupName: null,
      debt: '800000',
      daysOverdue: 45,
      bucket: 'critical',
    },
  ],
};

export const attendanceReport: AttendanceReportResponse = {
  items: [
    {
      id: 'g1',
      name: 'MATH-01',
      totalLessons: 12,
      presentCount: 90,
      lateCount: 6,
      absentCount: 10,
      excusedCount: 2,
      attendancePercentBp: 8611,
    },
  ],
  overallAttendancePercentBp: 8611,
};

export const forecasts: Forecasts = {
  revenue: {
    items: [
      {
        month: '2026-12',
        expected: '41000000',
        lowerBound: '38950000',
        upperBound: '43050000',
        activeEnrollmentsCount: 102,
        historicalCollectionRateBp: 9120,
      },
    ],
  },
  backtest: {
    period: '2026-10',
    predictedRevenue: '40000000',
    actualRevenue: '42000000',
    errorPercentage: 4.7,
    predictedChurnCount: 3,
    actualChurnCount: 2,
  },
  churn: {
    totalStudents: 2,
    atRiskCount: 1,
    items: [
      {
        studentId: 's2',
        studentName: 'Soliyeva Lola',
        studentCode: 102,
        groupName: 'MATH-01',
        churnScore: 70,
        isAtRisk: true,
        factors: [
          { factor: 'payment_delay', score: 30, weight: 30, reason: 'Toʻlov 45 kunga kechikkan' },
          {
            factor: 'attendance_drop',
            score: 40,
            weight: 40,
            reason: 'Oxirgi 4 haftada darslarning 100% iga kelmagan',
          },
          { factor: 'bot_unresponsive', score: 0, weight: 10, reason: 'Bot faol ulangan' },
        ],
      },
      {
        studentId: 's1',
        studentName: 'Karimov Ali',
        studentCode: 101,
        groupName: 'MATH-01',
        churnScore: 0,
        isAtRisk: false,
        factors: [],
      },
    ],
  },
  occupancy: {
    items: [
      {
        groupId: 'g1',
        groupName: 'MATH-01',
        capacity: 12,
        currentActive: 10,
        occupancyRateBp: 8333,
        projectedChurn: 1,
        projectedOccupancyRateBp: 7500,
      },
    ],
  },
};
