import {
  AddPayrollAdjustmentRequest,
  CreateTeacherAdvanceRequest,
  CreateTeacherContractRequest,
  DEFAULT_BRANCH_ID,
  GeneratePayrollRunRequest,
  type PayrollRunDetail,
  type TeacherContract,
} from '@lg/contracts';
import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { Authenticated, RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { PayrollService } from './payroll.service.js';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollController {
  constructor(@Inject(PayrollService) private readonly service: PayrollService) {}

  @Post('contracts')
  @RequirePermission('payroll.manage')
  @Audit({ action: 'contract.create', entity: 'teacher_contract' })
  @ApiOperation({ summary: 'FR-SAL-1 Ustoz shartnomasini yaratish' })
  async createContract(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateTeacherContractRequest) req: CreateTeacherContractRequest,
  ): Promise<TeacherContract> {
    return this.service.createContract(actor, DEFAULT_BRANCH_ID, req);
  }

  @Get('contracts')
  @RequirePermission('payroll.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Ustoz shartnomalari roʻyxati' })
  async listContracts(
    @CurrentUser() actor: RequestUser,
    @Query('teacherId') teacherId?: string,
  ): Promise<TeacherContract[]> {
    return this.service.listContracts(actor, teacherId);
  }

  @Post('advances')
  @RequirePermission('payroll.manage')
  @Audit({ action: 'advance.create', entity: 'teacher_advance' })
  @ApiOperation({ summary: 'BR-28 Ustozga avans berish' })
  async createAdvance(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateTeacherAdvanceRequest) req: CreateTeacherAdvanceRequest,
  ): Promise<{ id: string }> {
    return this.service.createAdvance(actor, DEFAULT_BRANCH_ID, req);
  }

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
