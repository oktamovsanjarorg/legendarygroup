import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AttendanceEditPayloadSchema,
  DiscountPayloadSchema,
  RefundPayloadSchema,
  ReversalPayloadSchema,
} from '@lg/contracts';
import type { AuditContext } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { AttendanceService } from '../attendance/index.js';
import type { RequestUser } from '../auth/index.js';
import { DiscountsService, StornoCashService } from '../billing/index.js';
import type { ApprovalWithUsers } from './approvals.repository.js';

/**
 * Tasdiqlangan so'rovni bajarish (02 §5: "qaror → amal bajariladi"). Amal Director nomidan,
 * odatdagi servis orqali — limit, ledger (teskari yozuv), audit va scope o'sha yerda.
 * Payload so'rov yaratilganda tekshirilgan; bu yerda yana parse — DB'dagi JSON ishonchsiz.
 */
@Injectable()
export class ApprovalExecutor {
  constructor(
    @Inject(DiscountsService) private readonly discounts: DiscountsService,
    @Inject(StornoCashService) private readonly stornoCash: StornoCashService,
    @Inject(AttendanceService) private readonly attendance: AttendanceService,
  ) {}

  async execute(req: ApprovalWithUsers, director: RequestUser, ctx: AuditContext): Promise<void> {
    const raw = req.payload as Record<string, unknown>;
    switch (req.type) {
      case 'discount': {
        const p = DiscountPayloadSchema.parse(raw);
        await this.discounts.setEnrollmentDiscount(
          p.enrollmentId,
          { percent: p.percent, reason: p.reason },
          director,
          ctx,
        );
        return;
      }
      case 'reversal': {
        const p = ReversalPayloadSchema.parse(raw);
        await this.stornoCash.reversePayment(p.paymentId, { reason: p.reason }, director, ctx);
        return;
      }
      case 'refund': {
        await this.stornoCash.refundPayment(RefundPayloadSchema.parse(raw), director, ctx);
        return;
      }
      case 'attendance_edit': {
        const p = AttendanceEditPayloadSchema.parse(raw);
        await this.attendance.markAttendance(
          director,
          p.lessonId,
          {
            changeReason: p.reason,
            items: [{ studentId: p.studentId, status: p.status, lateMinutes: p.lateMinutes }],
          },
          ctx,
        );
        return;
      }
      default:
        throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR');
    }
  }
}
