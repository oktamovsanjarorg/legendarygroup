import type {
  PayrollItem,
  PayrollRunDetail,
  TeacherContract,
  TeacherPayrollSummary,
} from '@lg/contracts';
import type { PayrollItemRow, PayrollRunRow, TeacherContractRow } from '@lg/db';

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

const EARNED_KINDS = ['fixed', 'percent', 'per_lesson'] as const;
const EXTRA_KINDS = ['bonus', 'penalty', 'adjustment'] as const;

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
    // Manfiy bo'lishi mumkin (avans > oylik) — yashirilmaydi, tasdiqlash bloklanadi.
    const net = val.items.reduce((sum, i) => sum + BigInt(i.amount), 0n);
    const sumOf = (kinds: readonly string[]) =>
      val.items.filter((i) => kinds.includes(i.kind)).reduce((s, i) => s + BigInt(i.amount), 0n);
    summaries.push({
      teacherId: tId,
      teacherName: val.name,
      totalNet: net.toString(),
      earned: sumOf(EARNED_KINDS).toString(),
      extras: sumOf(EXTRA_KINDS).toString(),
      advances: (-sumOf(['advance'])).toString(),
      items: val.items,
    });
  }

  return {
    id: run.id,
    branchId: run.branchId,
    period: run.period,
    status: run.status,
    totalAmount: run.totalAmount.toString(),
    generatedAt: run.generatedAt?.toISOString() ?? null,
    approvedBy: run.approvedBy,
    approvedAt: run.approvedAt?.toISOString() ?? null,
    paidBy: run.paidBy,
    paidAt: run.paidAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    teachers: summaries,
  };
}
