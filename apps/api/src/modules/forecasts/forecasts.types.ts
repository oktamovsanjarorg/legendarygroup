export interface RawStudentChurnData {
  studentId: string;
  studentName: string;
  studentCode: number;
  groupName: string | null;
  attendanceDropPercent: number;
  paymentDelayDays: number;
  gradeDropPercent: number;
  botUnresponsive: boolean;
}

export interface BacktestMetrics {
  predictedRevenue: bigint;
  actualRevenue: bigint;
  actualChurnCount: number;
}
