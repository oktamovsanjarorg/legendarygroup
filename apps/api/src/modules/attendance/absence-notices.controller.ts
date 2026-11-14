import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AbsenceNoticeItem,
  type AbsenceNoticeStatus,
  type CreateAbsenceNoticeRequest,
  CreateAbsenceNoticeSchema,
  type ListAbsenceNoticesQuery,
  ListAbsenceNoticesQuerySchema,
} from '@lg/contracts';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { AbsenceNoticesService } from './absence-notices.service.js';

@ApiTags('Absence Notices')
@ApiBearerAuth()
@Controller('attendance/absence-notices')
export class AbsenceNoticesController {
  constructor(@Inject(AbsenceNoticesService) private readonly service: AbsenceNoticesService) {}

  @Post()
  @RequirePermission('absence.notify')
  @Audit({ action: 'absence_notice.create', entity: 'absence_notice' })
  @ApiOperation({ summary: 'FR-ATT-7: Darsga kela olmaslik haqida oldindan xabar berish' })
  async create(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateAbsenceNoticeSchema) body: CreateAbsenceNoticeRequest,
  ): Promise<AbsenceNoticeItem> {
    return this.service.createNotice(actor, body);
  }

  @Get()
  @RequirePermission('absence.notify')
  @NoAudit('Sababli kelolmaslik xabarlari roʻyxati')
  @ApiOperation({ summary: 'FR-ATT-7: Sababli kelolmaslik xabarnomalari roʻyxati' })
  async list(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(ListAbsenceNoticesQuerySchema) query: ListAbsenceNoticesQuery,
  ): Promise<{ items: AbsenceNoticeItem[] }> {
    return this.service.listNotices(actor, query);
  }

  @Patch(':id/status')
  @RequirePermission('attendance.mark')
  @Audit({ action: 'absence_notice.status_update', entity: 'absence_notice' })
  @ApiOperation({ summary: 'FR-ATT-7: Sababli xabar holatini tasdiqlash yoki yangilash' })
  async updateStatus(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AbsenceNoticeStatus,
  ): Promise<AbsenceNoticeItem> {
    return this.service.updateStatus(actor, id, status);
  }
}
