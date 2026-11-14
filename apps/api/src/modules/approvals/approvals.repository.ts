import { Inject, Injectable } from '@nestjs/common';
import type { ApprovalListQueryInput } from '@lg/contracts';
import {
  approvalRequests,
  type ApprovalRequestRow,
  type Database,
  type NewApprovalRequestRow,
  type Transaction,
  users,
} from '@lg/db';
import { alias } from 'drizzle-orm/pg-core';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface ApprovalWithUsers extends ApprovalRequestRow {
  requestedByName: string | null;
  decidedByName: string | null;
}

const requesterUser = alias(users, 'requester');
const deciderUser = alias(users, 'decider');

@Injectable()
export class ApprovalsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findRequests(
    filter: ApprovalListQueryInput,
    branchId?: string,
  ): Promise<ApprovalWithUsers[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(approvalRequests.branchId, branchId));
    if (filter.status) conditions.push(eq(approvalRequests.status, filter.status));
    if (filter.type) conditions.push(eq(approvalRequests.type, filter.type));
    if (filter.cursor) {
      conditions.push(sql`${approvalRequests.createdAt} < ${filter.cursor}`);
    }

    const rows = await this.db
      .select({
        req: approvalRequests,
        requestedByName: requesterUser.fullName,
        decidedByName: deciderUser.fullName,
      })
      .from(approvalRequests)
      .leftJoin(requesterUser, eq(approvalRequests.requestedBy, requesterUser.id))
      .leftJoin(deciderUser, eq(approvalRequests.decidedBy, deciderUser.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(approvalRequests.createdAt))
      .limit(filter.limit);

    return rows.map((r) => ({
      ...r.req,
      requestedByName: r.requestedByName,
      decidedByName: r.decidedByName,
    }));
  }

  async findRequestById(id: string): Promise<ApprovalWithUsers | null> {
    const rows = await this.db
      .select({
        req: approvalRequests,
        requestedByName: requesterUser.fullName,
        decidedByName: deciderUser.fullName,
      })
      .from(approvalRequests)
      .leftJoin(requesterUser, eq(approvalRequests.requestedBy, requesterUser.id))
      .leftJoin(deciderUser, eq(approvalRequests.decidedBy, deciderUser.id))
      .where(eq(approvalRequests.id, id))
      .limit(1);

    const r = rows[0];
    if (!r) return null;
    return {
      ...r.req,
      requestedByName: r.requestedByName,
      decidedByName: r.decidedByName,
    };
  }

  async insertRequest(data: NewApprovalRequestRow, tx?: Transaction): Promise<ApprovalRequestRow> {
    const client = tx ?? this.db;
    const [row] = await client.insert(approvalRequests).values(data).returning();
    if (!row) {
      throw new Error('FAILED_TO_INSERT_APPROVAL_REQUEST');
    }
    return row;
  }

  async updateDecision(
    id: string,
    decision: {
      status: 'approved' | 'rejected';
      decidedBy: string;
      decidedAt: Date;
      decisionNote?: string;
    },
    tx?: Transaction,
  ): Promise<ApprovalRequestRow | null> {
    const client = tx ?? this.db;
    const [row] = await client
      .update(approvalRequests)
      .set({
        status: decision.status,
        decidedBy: decision.decidedBy,
        decidedAt: decision.decidedAt,
        decisionNote: decision.decisionNote ?? null,
      })
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.status, 'pending')))
      .returning();

    return row ?? null;
  }

  async expirePendingOlderThan(now: Date, tx?: Transaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client
      .update(approvalRequests)
      .set({ status: 'expired' })
      .where(and(eq(approvalRequests.status, 'pending'), lt(approvalRequests.expiresAt, now)))
      .returning();

    return res.length;
  }
}
