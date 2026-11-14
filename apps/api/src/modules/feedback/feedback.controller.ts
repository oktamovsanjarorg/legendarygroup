import { Controller, Get, Headers, Inject, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreateFeedbackInput,
  CreateFeedbackSchema,
  type FeedbackResponse,
} from '@lg/contracts';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { Authenticated, RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { FeedbackService } from './feedback.service.js';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(@Inject(FeedbackService) private readonly service: FeedbackService) {}

  @Post()
  @Authenticated()
  @Audit({ action: 'feedback.create', entity: 'feedback' })
  @ApiOperation({ summary: 'T-118: Ichki taklif yoki xatolik haqida fikr yuborish' })
  async create(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateFeedbackSchema) body: CreateFeedbackInput,
    @Headers('x-request-id') requestId?: string,
  ): Promise<FeedbackResponse> {
    return this.service.submitFeedback(actor, body, requestId);
  }

  @Get()
  @RequirePermission('settings.manage')
  @NoAudit('Feedback roʻyxati')
  @ApiOperation({ summary: 'T-118: Kelib tushgan fikr-mulohazalar roʻyxati (Direktor)' })
  async list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const lim = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 50;
    const off = offset ? Math.max(0, parseInt(offset, 10)) : 0;
    return this.service.listFeedbacks(lim, off);
  }
}
