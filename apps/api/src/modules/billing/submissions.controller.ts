import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ConfirmPaymentSubmissionRequest,
  type ConfirmPaymentSubmissionInput,
  type ConfirmSubmissionResponse,
  CreatePaymentSubmissionRequest,
  type CreatePaymentSubmissionInput,
  type PaymentSubmission,
  PaymentSubmissionListQuery,
  type PaymentSubmissionListQueryInput,
  RejectPaymentSubmissionRequest,
  type RejectPaymentSubmissionInput,
  type SubmissionActionResponse,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { SubmissionsService } from './submissions.service.js';

@ApiTags('Billing: Submissions')
@ApiBearerAuth()
@Controller('billing/submissions')
export class SubmissionsController {
  constructor(@Inject(SubmissionsService) private readonly submissions: SubmissionsService) {}

  @Post()
  @RequirePermission('payment.submit')
  @Audit({ action: 'submission.create', entity: 'payment_submission' })
  @ApiOperation({ summary: 'FR-PAY-3 Ota-ona tomonidan toʻlov chekini yuborish' })
  async createSubmission(
    @CurrentUser() user: RequestUser,
    @ZodBody(CreatePaymentSubmissionRequest) body: CreatePaymentSubmissionInput,
    @Req() req: FastifyRequest,
  ): Promise<PaymentSubmission> {
    return this.submissions.createSubmission(user, body, auditContext(req));
  }

  @Get('my')
  @RequirePermission('payment.submit')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Ota-ona oʻz yuborgan toʻlov cheklari roʻyxati' })
  async getMySubmissions(@CurrentUser() user: RequestUser): Promise<PaymentSubmission[]> {
    return this.submissions.getMySubmissions(user);
  }

  @Get()
  @RequirePermission('payment.review')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'W-14, MS-02 Admin uchun chek tasdiqlash navbati' })
  async getQueue(
    @ZodQuery(PaymentSubmissionListQuery) query: PaymentSubmissionListQueryInput,
  ): Promise<PaymentSubmission[]> {
    return this.submissions.getQueue(query);
  }

  @Get(':id')
  @RequirePermission('payment.review')
  @NoAudit('GET single')
  @ApiOperation({ summary: 'Chek tafsilotlari' })
  async getSubmissionById(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentSubmission> {
    return this.submissions.getSubmissionById(id);
  }

  @Post(':id/lock')
  @RequirePermission('payment.review')
  @NoAudit('POST lock')
  @ApiOperation({ summary: 'BR-13 Chekni 5 daqiqaga qulflash' })
  async lockSubmission(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentSubmission> {
    return this.submissions.lockSubmission(user, id);
  }

  @Post(':id/confirm')
  @RequirePermission('payment.review')
  @Audit({ action: 'submission.confirm', entity: 'payment_submission' })
  @ApiOperation({ summary: 'BR-13 Chekni tasdiqlash va toʻlovga oʻtkazish' })
  async confirmSubmission(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ConfirmPaymentSubmissionRequest) body: ConfirmPaymentSubmissionInput,
    @Req() req: FastifyRequest,
  ): Promise<ConfirmSubmissionResponse> {
    return this.submissions.confirmSubmission(user, id, body, auditContext(req));
  }

  @Post(':id/reject')
  @RequirePermission('payment.review')
  @Audit({ action: 'submission.reject', entity: 'payment_submission' })
  @ApiOperation({ summary: 'BR-13 Chekni rad etish' })
  async rejectSubmission(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(RejectPaymentSubmissionRequest) body: RejectPaymentSubmissionInput,
    @Req() req: FastifyRequest,
  ): Promise<SubmissionActionResponse> {
    return this.submissions.rejectSubmission(user, id, body, auditContext(req));
  }
}
