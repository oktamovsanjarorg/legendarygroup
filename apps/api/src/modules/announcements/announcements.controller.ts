import { Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AnnouncementItem,
  type AnnouncementListQuery,
  AnnouncementListQuerySchema,
  type AnnouncementPreviewQuery,
  AnnouncementPreviewQuerySchema,
  type AnnouncementPreviewResponse,
  type AnnouncementStats,
  type CreateAnnouncementRequest,
  CreateAnnouncementSchema,
} from '@lg/contracts';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { AnnouncementsService } from './announcements.service.js';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(@Inject(AnnouncementsService) private readonly service: AnnouncementsService) {}

  @Get('preview')
  @RequirePermission('announcement.send')
  @NoAudit('Eʼlon auditoriyasini koʻrish')
  @ApiOperation({ summary: 'FR-RPT-5: Tanlangan auditoriya qamrovini oldindan koʻrish' })
  async preview(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(AnnouncementPreviewQuerySchema) query: AnnouncementPreviewQuery,
  ): Promise<AnnouncementPreviewResponse> {
    return this.service.preview(actor, query);
  }

  @Post()
  @RequirePermission('announcement.send')
  @Audit({ action: 'announcement.create', entity: 'announcement' })
  @ApiOperation({ summary: 'FR-RPT-5: Ommaviy eʼlon yaratish va tarqatish' })
  async create(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateAnnouncementSchema) body: CreateAnnouncementRequest,
  ): Promise<AnnouncementItem> {
    return this.service.createAndSend(actor, body);
  }

  @Get()
  @RequirePermission('announcement.send')
  @NoAudit('Eʼlonlar roʻyxati')
  @ApiOperation({ summary: 'FR-RPT-5: Yuborilgan eʼlonlar roʻyxati' })
  async list(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(AnnouncementListQuerySchema) query: AnnouncementListQuery,
  ): Promise<{ items: AnnouncementItem[] }> {
    return this.service.list(actor, query);
  }

  @Get(':id')
  @RequirePermission('announcement.send')
  @NoAudit('Eʼlon tafsiloti')
  @ApiOperation({ summary: 'FR-RPT-5: Eʼlon tafsilotlarini olish' })
  async getById(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnnouncementItem> {
    return this.service.getById(actor, id);
  }

  @Get(':id/stats')
  @RequirePermission('announcement.send')
  @NoAudit('Eʼlon statistikasi')
  @ApiOperation({ summary: 'FR-RPT-5: Eʼlon yetkazilish statistikasi' })
  async getStats(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnnouncementStats> {
    return this.service.getStats(actor, id);
  }
}
