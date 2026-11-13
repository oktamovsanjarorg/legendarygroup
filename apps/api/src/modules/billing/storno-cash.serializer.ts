import type { CashClosing } from '@lg/contracts';
import type { CashClosingWithUser } from './storno-cash.repository.js';

export function serializeCashClosing(row: CashClosingWithUser): CashClosing {
  return {
    id: row.id,
    branchId: row.branchId,
    date: row.date,
    expectedCash: row.expectedCash.toString(),
    countedCash: row.countedCash.toString(),
    diff: row.diff.toString(),
    closedBy: row.closedBy,
    closedByName: row.closedByName ?? undefined,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}
