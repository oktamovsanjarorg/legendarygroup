import { randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { PaymentSubmissionRow } from '@lg/db';
import type {
  ConfirmPaymentSubmissionInput,
  ConfirmSubmissionResponse,
  CreatePaymentSubmissionInput,
  PaymentSubmission,
  PaymentSubmissionListQueryInput,
  RejectPaymentSubmissionInput,
  SubmissionActionResponse,
} from '@lg/contracts';
import { type Clock, canReviewSubmission } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { FilesService } from '../files/index.js';
import { StudentScopeService } from '../students/index.js';
import { TelegramOutbox } from '../telegram/index.js';
import { type EnrichedSubmissionRow, SubmissionsRepository } from './submissions.repository.js';

const BRANCH_ID = '01900000-0000-7000-8000-000000000001';
const LOCK_MINUTES = 5;

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @Inject(SubmissionsRepository) private readonly repo: SubmissionsRepository,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(FilesService) private readonly filesService: FilesService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Optional() @Inject(TelegramOutbox) private readonly telegramOutbox?: TelegramOutbox,
  ) {}

  /** Ota-ona tomonidan to'lov chekini yuborish (FR-PAY-3, T-206). */
  async createSubmission(
    user: RequestUser,
    input: CreatePaymentSubmissionInput,
    ctx: AuditContext,
  ): Promise<PaymentSubmission> {
    await this.studentScope.assertVisible(user, input.studentId);

    const guardianId = await this.studentScope.guardianIdOf(user);
    if (!guardianId) throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');

    const amount = BigInt(input.amountClaimed);
    const dup = await this.repo.checkDuplicate({
      studentId: input.studentId,
      amount,
      fileId: input.fileId,
    });

    const row = await this.repo.createSubmission({
      branchId: BRANCH_ID,
      studentId: input.studentId,
      guardianId,
      amountClaimed: amount,
      comment: input.comment ?? null,
      fileId: input.fileId,
      status: 'pending_review',
    });

    await this.audit.record(ctx, {
      action: 'submission.create',
      entity: 'payment_submission',
      entityId: row.id,
      after: { id: row.id, studentId: row.studentId, amount: row.amountClaimed.toString() },
    });

    return this.serializeSingle(row, dup.reason);
  }

  /** Ota-ona o'z yuborgan cheklarini ko'rishi. */
  async getMySubmissions(user: RequestUser): Promise<PaymentSubmission[]> {
    const guardianId = await this.studentScope.guardianIdOf(user);
    if (!guardianId) throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');

    const list = await this.repo.findSubmissionsByGuardian(guardianId);
    return Promise.all(list.map((r) => this.serializeEnriched(r)));
  }

  /** Admin uchun chek tasdiqlash navbati (W-14, MS-02). */
  async getQueue(query: PaymentSubmissionListQueryInput): Promise<PaymentSubmission[]> {
    const list = await this.repo.findQueue(query.status);
    return Promise.all(list.map((r) => this.serializeEnriched(r)));
  }

  /** Bitta chek ma'lumotlari. */
  async getSubmissionById(id: string): Promise<PaymentSubmission> {
    const row = await this.repo.findEnrichedById(id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return this.serializeEnriched(row);
  }

  /** Chekni 5 daqiqaga qulflash (BR-13). */
  async lockSubmission(user: RequestUser, id: string): Promise<PaymentSubmission> {
    const row = await this.repo.findSubmissionById(id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const now = this.clock.now();
    const policy = canReviewSubmission(
      {
        status: row.status,
        reviewerId: user.id,
        lockedBy: row.reviewLockedBy,
        lockedUntil: row.reviewLockedUntil,
      },
      now,
    );

    if (!policy.allowed) {
      const code = policy.reason === 'LOCKED_BY_OTHER' ? 'LOCKED_BY_OTHER' : 'ALREADY_REVIEWED';
      throw new AppException(HttpStatus.CONFLICT, code);
    }

    const lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
    const updated = await this.repo.lockSubmission(id, user.id, lockedUntil);
    if (!updated) throw new AppException(HttpStatus.CONFLICT, 'ALREADY_REVIEWED');

    return this.serializeSingle(updated);
  }

  /** Chekni tasdiqlash (BR-13, BR-14, BR-19). */
  async confirmSubmission(
    user: RequestUser,
    id: string,
    input: ConfirmPaymentSubmissionInput,
    ctx: AuditContext,
  ): Promise<ConfirmSubmissionResponse> {
    const row = await this.repo.findSubmissionById(id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const now = this.clock.now();
    const policy = canReviewSubmission(
      {
        status: row.status,
        reviewerId: user.id,
        lockedBy: row.reviewLockedBy,
        lockedUntil: row.reviewLockedUntil,
      },
      now,
    );
    if (!policy.allowed) {
      const code = policy.reason === 'LOCKED_BY_OTHER' ? 'LOCKED_BY_OTHER' : 'ALREADY_REVIEWED';
      throw new AppException(HttpStatus.CONFLICT, code);
    }

    const finalAmount = input.amount ? BigInt(input.amount) : row.amountClaimed;
    const verifyToken = randomBytes(16).toString('hex');

    const result = await this.repo.confirmSubmissionTx({
      submissionId: id,
      userId: user.id,
      finalAmount,
      branchId: row.branchId,
      verifyToken,
    });

    await this.audit.record(ctx, {
      action: 'submission.confirm',
      entity: 'payment_submission',
      entityId: id,
      before: { status: row.status, amount: row.amountClaimed.toString() },
      after: {
        status: 'confirmed',
        finalAmount: finalAmount.toString(),
        paymentId: result.paymentId,
      },
    });

    if (this.telegramOutbox) {
      await this.telegramOutbox.enqueue(
        {
          method: 'sendMessage',
          chatId: row.guardianId,
          payload: { text: `To'lovingiz tasdiqlandi. Chek raqami: ${result.receiptNumber}` },
        },
        { dedupeKey: `sub:confirmed:${id}` },
      );
    }

    return { success: true, paymentId: result.paymentId, receiptNumber: result.receiptNumber };
  }

  /** Chekni rad etish (BR-13). */
  async rejectSubmission(
    user: RequestUser,
    id: string,
    input: RejectPaymentSubmissionInput,
    ctx: AuditContext,
  ): Promise<SubmissionActionResponse> {
    const row = await this.repo.findSubmissionById(id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const now = this.clock.now();
    const policy = canReviewSubmission(
      {
        status: row.status,
        reviewerId: user.id,
        lockedBy: row.reviewLockedBy,
        lockedUntil: row.reviewLockedUntil,
      },
      now,
    );
    if (!policy.allowed) {
      const code = policy.reason === 'LOCKED_BY_OTHER' ? 'LOCKED_BY_OTHER' : 'ALREADY_REVIEWED';
      throw new AppException(HttpStatus.CONFLICT, code);
    }

    const updated = await this.repo.rejectSubmission(id, user.id, input.reason);
    if (!updated) throw new AppException(HttpStatus.CONFLICT, 'ALREADY_REVIEWED');

    await this.audit.record(ctx, {
      action: 'submission.reject',
      entity: 'payment_submission',
      entityId: id,
      before: { status: row.status },
      after: { status: 'rejected', reason: input.reason },
    });

    if (this.telegramOutbox) {
      await this.telegramOutbox.enqueue(
        {
          method: 'sendMessage',
          chatId: row.guardianId,
          payload: { text: `To'lov chekingiz rad etildi. Sabab: ${input.reason}` },
        },
        { dedupeKey: `sub:rejected:${id}` },
      );
    }

    return { success: true };
  }

  private serializeSingle(row: PaymentSubmissionRow, duplicateWarning?: string): PaymentSubmission {
    return {
      id: row.id,
      branchId: row.branchId,
      studentId: row.studentId,
      guardianId: row.guardianId,
      amountClaimed: row.amountClaimed.toString(),
      comment: row.comment,
      fileId: row.fileId,
      status: row.status,
      reviewLockedBy: row.reviewLockedBy,
      reviewLockedUntil: row.reviewLockedUntil ? row.reviewLockedUntil.toISOString() : null,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      rejectReason: row.rejectReason,
      paymentId: row.paymentId,
      duplicateWarning: duplicateWarning ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async serializeEnriched(r: EnrichedSubmissionRow): Promise<PaymentSubmission> {
    let fileUrl: string | null = null;
    if (r.fileId) {
      try {
        const view = await this.filesService.scopedViewUrl(r.fileId);
        fileUrl = view.url;
      } catch {
        fileUrl = null;
      }
    }

    const now = this.clock.now();
    const overdue =
      r.status === 'pending_review' && now.getTime() - r.createdAt.getTime() > 24 * 60 * 60 * 1000;

    return {
      id: r.id,
      branchId: r.branchId,
      studentId: r.studentId,
      studentName: r.studentName,
      studentCode: `LG-${r.studentCode}`,
      groupName: r.groupName,
      guardianId: r.guardianId,
      guardianName: r.guardianName,
      amountClaimed: r.amountClaimed.toString(),
      comment: r.comment,
      fileId: r.fileId,
      fileUrl,
      status: r.status,
      reviewLockedBy: r.reviewLockedBy,
      reviewLockedUntil: r.reviewLockedUntil ? r.reviewLockedUntil.toISOString() : null,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      rejectReason: r.rejectReason,
      paymentId: r.paymentId,
      receiptNumber: r.receiptNumber ?? null,
      overdue,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
