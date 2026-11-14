import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DebtorListQuery,
  type DebtorListQueryInput,
  type DebtorListResponse,
  type SendReminderResponse,
} from '@lg/contracts';
import type { FastifyReply } from 'fastify';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { DebtorsService } from './debtors.service.js';

@ApiTags('Billing: Debtors')
@ApiBearerAuth()
@Controller('billing/debtors')
export class DebtorsController {
  constructor(@Inject(DebtorsService) private readonly debtors: DebtorsService) {}

  @Get()
  @RequirePermission('billing.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'W-15 Qarzdorlar roʻyxati (aging, saralash, filtr)' })
  async getDebtors(
    @CurrentUser() user: RequestUser,
    @ZodQuery(DebtorListQuery) query: DebtorListQueryInput,
  ): Promise<DebtorListResponse> {
    return this.debtors.getDebtors(user, query);
  }

  @Get('export')
  @RequirePermission('billing.view')
  @NoAudit('GET export')
  @ApiOperation({ summary: 'W-15 Qarzdorlar roʻyxatini CSV formatida yuklab olish' })
  async exportCsv(
    @CurrentUser() user: RequestUser,
    @ZodQuery(DebtorListQuery) query: DebtorListQueryInput,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const csv = await this.debtors.exportDebtorsCsv(user, query);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="debtors.csv"');
    res.send(csv);
  }

  @Post(':studentId/remind')
  @RequirePermission('billing.view')
  @Audit({ action: 'payment_reminder.send', entity: 'payment_reminder' })
  @ApiOperation({ summary: 'Qarzdor oʻquvchi ota-onasiga qoʻlda eslatma yuborish' })
  async remindStudent(
    @CurrentUser() user: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<SendReminderResponse> {
    return this.debtors.sendManualReminder(user, studentId);
  }
}
