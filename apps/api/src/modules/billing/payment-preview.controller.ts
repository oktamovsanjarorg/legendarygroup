import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type DiscountListResponse,
  type PaymentPreview,
  PaymentPreviewQuery,
  type PaymentPreviewQueryInput,
  type PaymentView,
} from '@lg/contracts';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { DiscountListService } from './discount-list.service.js';
import { PaymentPreviewService } from './payment-preview.service.js';
import { PaymentViewService } from './payment-view.service.js';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class PaymentPreviewController {
  constructor(
    @Inject(PaymentPreviewService) private readonly svc: PaymentPreviewService,
    @Inject(PaymentViewService) private readonly views: PaymentViewService,
    @Inject(DiscountListService) private readonly discounts: DiscountListService,
  ) {}

  @Get('discounts')
  @RequirePermission('discount.grant')
  @NoAudit('GET — yozuv yoʻq')
  @ApiOperation({ summary: 'W-18: amaldagi chegirmalar (BR-18)' })
  async listDiscounts(@CurrentUser() user: RequestUser): Promise<DiscountListResponse> {
    return this.discounts.list(user);
  }

  @Get('payments/preview')
  @RequirePermission('payment.create')
  @NoAudit('GET — yozuv yoʻq')
  @ApiOperation({ summary: 'W-13: toʻlov FIFO taqsimoti oldindan (BR-12)' })
  async preview(
    @CurrentUser() user: RequestUser,
    @ZodQuery(PaymentPreviewQuery) query: PaymentPreviewQueryInput,
  ): Promise<PaymentPreview> {
    return this.svc.preview(user, query);
  }

  @Get('payments/:id/view')
  @RequirePermission('billing.view')
  @NoAudit('GET — yozuv yoʻq')
  @ApiOperation({ summary: 'W-17: toʻlov tafsiloti — chek, taqsimot, storno holati' })
  async view(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentView> {
    return this.views.view(user, id);
  }
}
