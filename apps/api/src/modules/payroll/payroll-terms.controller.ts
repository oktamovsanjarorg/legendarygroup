import {
  CreateTeacherAdvanceRequest,
  CreateTeacherContractRequest,
  DEFAULT_BRANCH_ID,
  EndTeacherContractRequest,
  type TeacherAdvance,
  type TeacherContract,
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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { PayrollTermsService } from './payroll-terms.service.js';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollTermsController {
  constructor(@Inject(PayrollTermsService) private readonly service: PayrollTermsService) {}

  @Post('contracts')
  @RequirePermission('payroll.manage')
  @Audit({ action: 'contract.create', entity: 'teacher_contract' })
  @ApiOperation({ summary: 'FR-SAL-1 Ustoz shartnomasini yaratish' })
  async createContract(
    @ZodBody(CreateTeacherContractRequest) req: CreateTeacherContractRequest,
  ): Promise<TeacherContract> {
    return this.service.createContract(DEFAULT_BRANCH_ID, req);
  }

  @Get('contracts')
  @RequirePermission('payroll.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Ustoz shartnomalari roʻyxati' })
  async listContracts(@Query('teacherId') teacherId?: string): Promise<TeacherContract[]> {
    return this.service.listContracts(teacherId);
  }

  @Post('contracts/:id/end')
  @HttpCode(200)
  @RequirePermission('payroll.manage')
  @Audit({ action: 'contract.end', entity: 'teacher_contract' })
  @ApiOperation({ summary: 'Shartnomani tugatish (oxirgi kun)' })
  async endContract(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(EndTeacherContractRequest) req: EndTeacherContractRequest,
  ): Promise<TeacherContract> {
    return this.service.endContract(id, req.validTo);
  }

  @Delete('contracts/:id')
  @HttpCode(204)
  @RequirePermission('payroll.manage')
  @Audit({ action: 'contract.delete', entity: 'teacher_contract' })
  @ApiOperation({ summary: 'Xato kiritilgan shartnomani oʻchirish (oylikda ishlatilmagan)' })
  async deleteContract(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.deleteContract(id);
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

  @Get('advances')
  @RequirePermission('payroll.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Avanslar va ushlangan qismi (BR-28)' })
  async listAdvances(): Promise<TeacherAdvance[]> {
    return this.service.listAdvances();
  }

  @Delete('advances/:id')
  @HttpCode(204)
  @RequirePermission('payroll.manage')
  @Audit({ action: 'advance.delete', entity: 'teacher_advance' })
  @ApiOperation({ summary: 'Xato kiritilgan avansni oʻchirish (hali ushlanmagan)' })
  async deleteAdvance(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.deleteAdvance(id);
  }
}
