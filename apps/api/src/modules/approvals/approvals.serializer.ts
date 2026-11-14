import type { ApprovalRequest } from '@lg/contracts';
import type { ApprovalWithUsers } from './approvals.repository.js';

export function serializeApproval(row: ApprovalWithUsers): ApprovalRequest {
  return {
    id: row.id,
    branchId: row.branchId,
    type: row.type,
    payload: row.payload,
    reason: row.reason,
    requestedBy: row.requestedBy,
    requestedByName: row.requestedByName ?? undefined,
    status: row.status,
    decidedBy: row.decidedBy,
    decidedByName: row.decidedByName ?? undefined,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    decisionNote: row.decisionNote,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
