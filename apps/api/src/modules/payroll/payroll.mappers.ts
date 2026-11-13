import type {
  PayrollItem,
  PayrollRunDetail,
  TeacherContract,
  TeacherPayrollSummary,
} from '@lg/contracts';
import type { PayrollItemRow, PayrollRunRow, TeacherContractRow } from '@lg/db';
import { calculateNetSalary } from '@lg/domain';

export function mapContractRow(row: TeacherContractRow): TeacherContract {
  return {
    id: row.id,
    branchId: row.branchId,
    teacherId: row.teacherId,
    groupId: row.groupId,
    type: row.type,
    fixedAmount: row.fixedAmount.toString(),
    percentBp: row.percentBp,
    perLessonRate: row.perLessonRate.toString(),
    base: row.base,
    validFrom: row.validFrom,
    validTo: row.validTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapItemRow(row: PayrollItemRow & { teacherName?: string }): PayrollItem {
  return {
    id: row.id,
    runId: row.runId,
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    kind: row.kind,
    amount: row.amount.toString(),
    details: row.details as Record<string, unknown>,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export function buildPayrollRunDetail(
  run: PayrollRunRow,
  items: Array<PayrollItemRow & { teacherName: string }>,
): PayrollRunDetail {
  const teacherMap = new Map<string, { name: string; items: PayrollItem[] }>();
  for (const it of items) {
    let entry = teacherMap.get(it.teacherId);
    if (!entry) {
      entry = { name: it.teacherName, items: [] };
      teacherMap.set(it.teacherId, entry);
    }
    entry.items.push(mapItemRow(it));
  }

  const summaries: TeacherPayrollSummary[] = [];
  for (const [tId, val] of teacherMap.entries()) {
    const net = calculateNetSalary(
      val.items.map((i) => ({ kind: i.kind, amount: BigInt(i.amount) })),
    );
    summaries.push({
      teacherId: tId,
      teacherName: val.name,
      totalNet: net.toString(),
      items: val.items,
    });
  }

  return {
    id: run.id,
    branchId: run.branchId,
    period: run.period,
    status: run.status,
    totalAmount: run.totalAmount.toString(),
    approvedBy: run.approvedBy,
    approvedAt: run.approvedAt?.toISOString() ?? null,
    paidBy: run.paidBy,
    paidAt: run.paidAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    teachers: summaries,
  };
}
