import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type PaymentPreview,
  PaymentPreviewQuery,
  type PaymentPreviewQueryInput,
} from '@lg/contracts';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { PaymentPreviewService } from './payment-preview.service.js';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing/payments/preview')
export class PaymentPreviewController {
  constructor(@Inject(PaymentPreviewService) private readonly svc: PaymentPreviewService) {}

  @Get()
  @RequirePermission('payment.create')
  @NoAudit('GET — yozuv yoʻq')
  @ApiOperation({ summary: 'W-13: toʻlov FIFO taqsimoti oldindan (BR-12)' })
  async preview(
    @CurrentUser() user: RequestUser,
    @ZodQuery(PaymentPreviewQuery) query: PaymentPreviewQueryInput,
  ): Promise<PaymentPreview> {
    return this.svc.preview(user, query);
  }
}
