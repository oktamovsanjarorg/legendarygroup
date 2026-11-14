export interface ActiveEnrollmentInfo {
  enrollmentId: string;
  studentId: string;
  groupId: string;
  startDate: string;
  endDate: string | null;
  discountPercent: number | null;
  monthlyPrice: bigint;
  groupName: string;
}

export interface OpenLineInfo {
  id: string;
  invoiceId: string;
  dueDate: string;
  amount: bigint;
  allocated: bigint;
  outstanding: bigint;
}
