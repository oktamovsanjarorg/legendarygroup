import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  ApprovalListQueryInput,
  ApprovalRequest,
  CreateApprovalRequestInput,
  DecideApprovalRequestInput,
} from '@lg/contracts';
import { type Database, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { ApprovalExecutorService } from './approval-executor.service.js';
import { ApprovalsRepository, type ApprovalWithUsers } from './approvals.repository.js';
import { serializeApproval } from './approvals.serializer.js';

const EXPIRATION_HOURS = 48;

@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(ApprovalsRepository) private readonly repo: ApprovalsRepository,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(ApprovalExecutorService) private readonly executor: ApprovalExecutorService,
  ) {}

  async createRequest(
    input: CreateApprovalRequestInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<ApprovalRequest> {
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000);

    const row = await this.db.transaction(async (tx) => {
      const created = await this.repo.insertRequest(
        {
          type: input.type,
          payload: input.payload as Record<string, unknown>,
          reason: input.reason,
          requestedBy: user.id,
          status: 'pending',
          expiresAt,
        },
        tx,
      );

      await this.audit.record(
        ctx,
        {
          action: 'approval.create',
          entity: 'approval_request',
          entityId: created.id,
          after: { type: input.type, reason: input.reason },
        },
        tx,
      );

      return created;
    });

    const full = await this.repo.findRequestById(row.id);
    return serializeApproval(full ?? { ...row, requestedByName: null, decidedByName: null });
  }

  async listRequests(query: ApprovalListQueryInput): Promise<ApprovalRequest[]> {
    await this.repo.expirePendingOlderThan(this.clock.now());
    const list = await this.repo.findRequests(query);
    return list.map(serializeApproval);
  }

  async getRequestById(id: string): Promise<ApprovalRequest> {
    const row = await this.repo.findRequestById(id);
    if (!row) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Soʻrov topilmadi');
    }
    return serializeApproval(row);
  }

  async decide(
    id: string,
    input: DecideApprovalRequestInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<ApprovalRequest> {
    const existing = await this.repo.findRequestById(id);
    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Soʻrov topilmadi');
    }

    this.validatePendingState(existing);

    await this.executeDecisionTx(existing, input, user, ctx);

    const updated = await this.repo.findRequestById(id);
    if (!updated) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Soʻrov topilmadi');
    }
    return serializeApproval(updated);
  }

  private validatePendingState(req: ApprovalWithUsers): void {
    if (req.status !== 'pending') {
      throw new AppException(HttpStatus.CONFLICT, 'CONFLICT', 'Soʻrov allaqachon koʻrib chiqilgan');
    }
    if (this.clock.now() > req.expiresAt) {
      throw new AppException(HttpStatus.CONFLICT, 'CONFLICT', 'Soʻrov muddati tugagan');
    }
  }

  private async executeDecisionTx(
    req: ApprovalWithUsers,
    input: DecideApprovalRequestInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<void> {
    const now = this.clock.now();
    const newStatus = input.decision === 'approve' ? 'approved' : 'rejected';

    await this.db.transaction(async (tx: Transaction) => {
      const updated = await this.repo.updateDecision(
        req.id,
        {
          status: newStatus,
          decidedBy: user.id,
          decidedAt: now,
          decisionNote: input.note,
        },
        tx,
      );

      if (!updated) {
        throw new AppException(HttpStatus.CONFLICT, 'CONFLICT', 'Soʻrov holati oʻzgargan');
      }

      if (newStatus === 'approved') {
        await this.executor.execute({ ...req, decidedBy: user.id }, tx);
      }

      await this.audit.record(
        ctx,
        {
          action: 'approval.decide',
          entity: 'approval_request',
          entityId: req.id,
          before: { status: req.status },
          after: { status: newStatus, note: input.note },
        },
        tx,
      );
    });
  }
}
