import {
  type OwnPayrollMonth,
  AddPayrollAdjustmentRequest,
  DEFAULT_BRANCH_ID,
  GeneratePayrollRunRequest,
  PayrollRunByPeriodQuery,
  type PayrollRunDetail,
} from '@lg/contracts';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { Authenticated, RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { PayrollService } from './payroll.service.js';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollController {
  constructor(@Inject(PayrollService) private readonly service: PayrollService) {}

  @Post('runs/generate')
  @RequirePermission('payroll.manage')
  @Audit({ action: 'payroll.generate', entity: 'payroll_run' })
  @ApiOperation({ summary: 'FR-SAL-2 Oylik hisob-kitob qoralamasini yaratish' })
  async generatePayrollRun(
    @CurrentUser() actor: RequestUser,
    @ZodBody(GeneratePayrollRunRequest) req: GeneratePayrollRunRequest,
  ): Promise<PayrollRunDetail> {
    return this.service.generatePayrollRun(actor, DEFAULT_BRANCH_ID, req.period);
  }

  @Get('my')
  @RequirePermission('payroll.view_own')
  @NoAudit('GET query')
  @ApiOperation({ summary: "FR-SAL-4 Ustozning o'z oyliklari (oylar ro'yxati)" })
  listOwn(@CurrentUser() actor: RequestUser): Promise<OwnPayrollMonth[]> {
    return this.service.listOwnPayroll(actor);
  }

  @Get('runs')
  @RequirePermission('payroll.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: "W-25: davr bo'yicha oylik hisobi (yo'q bo'lsa — null)" })
  async runByPeriod(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(PayrollRunByPeriodQuery) q: PayrollRunByPeriodQuery,
  ): Promise<PayrollRunDetail | null> {
    return this.service.findRunByPeriod(actor, DEFAULT_BRANCH_ID, q.period);
  }

  @Get('runs/:id')
  @Authenticated()
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Oylik hisob-kitob tafsilotlari' })
  async getPayrollRun(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayrollRunDetail> {
    return this.service.getPayrollRun(actor, id);
  }

  @Post('runs/:id/adjustments')
  @RequirePermission('payroll.manage')
  @Audit({ action: 'payroll.adjust', entity: 'payroll_item' })
  @ApiOperation({ summary: 'BR-26 Bonus yoki jarima kiritish' })
  async addAdjustment(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(AddPayrollAdjustmentRequest) req: AddPayrollAdjustmentRequest,
  ): Promise<{ success: true }> {
    await this.service.addAdjustment(actor, id, req);
    return { success: true };
  }

  @Delete('runs/:id/adjustments/:itemId')
  @HttpCode(204)
  @RequirePermission('payroll.manage')
  @Audit({ action: 'payroll.adjust_remove', entity: 'payroll_item' })
  @ApiOperation({ summary: 'BR-26 Xato bonus/jarimani qoralamadan olib tashlash' })
  async removeAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.service.removeAdjustment(id, itemId);
  }

  @Post('runs/:id/approve')
  @RequirePermission('approval.decide')
  @Audit({ action: 'payroll.approve', entity: 'payroll_run' })
  @ApiOperation({ summary: 'BR-27 Oylik hisobini tasdiqlash' })
  async approvePayrollRun(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.service.approvePayrollRun(actor, id);
    return { success: true };
  }

  @Post('runs/:id/pay')
  @RequirePermission('payroll.manage')
  @Audit({ action: 'payroll.pay', entity: 'payroll_run' })
  @ApiOperation({ summary: 'BR-27 Oylik toʻlangan deb belgilash' })
  async markPayrollPaid(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.service.markPayrollPaid(actor, id);
    return { success: true };
  }
}
