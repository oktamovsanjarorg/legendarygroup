import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApprovalListQuery,
  type ApprovalListQueryInput,
  type ApprovalRequest,
  CreateApprovalRequest,
  type CreateApprovalRequestInput,
  DecideApprovalRequest,
  type DecideApprovalRequestInput,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { ApprovalsService } from './approvals.service.js';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(@Inject(ApprovalsService) private readonly approvals: ApprovalsService) {}

  @Get()
  @RequirePermission('payment.review')
  @NoAudit('GET query')
  @ApiOperation({
    summary: "Tasdiqlash so'rovlari ro'yxati (pending, approved, rejected, expired)",
  })
  async list(
    @CurrentUser() user: RequestUser,
    @ZodQuery(ApprovalListQuery) query: ApprovalListQueryInput,
  ): Promise<ApprovalRequest[]> {
    return this.approvals.listRequests(query);
  }

  @Get(':id')
  @RequirePermission('payment.review')
  @NoAudit('GET query')
  @ApiOperation({ summary: "Tasdiqlash so'rovi tafsilotlari" })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ApprovalRequest> {
    return this.approvals.getRequestById(id);
  }

  @Post()
  @RequirePermission('payment.create')
  @NoAudit('Handled in service transaction')
  @ApiOperation({ summary: "Yangi tasdiqlash so'rovi ochish (Admin)" })
  async create(
    @CurrentUser() user: RequestUser,
    @ZodBody(CreateApprovalRequest) body: CreateApprovalRequestInput,
    @Req() req: FastifyRequest,
  ): Promise<ApprovalRequest> {
    return this.approvals.createRequest(body, user, auditContext(req));
  }

  @Post(':id/decide')
  @RequirePermission('approval.decide')
  @NoAudit('Handled in service transaction')
  @ApiOperation({ summary: "So'rov bo'yicha qaror qabul qilish (faqat Director)" })
  async decide(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @ZodBody(DecideApprovalRequest) body: DecideApprovalRequestInput,
    @Req() req: FastifyRequest,
  ): Promise<ApprovalRequest> {
    return this.approvals.decide(id, body, user, auditContext(req));
  }
}
