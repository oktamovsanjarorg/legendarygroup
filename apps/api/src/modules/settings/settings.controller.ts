import { Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type PublicSettings, UpdateSystemSettingsSchema } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { auditContext } from '../auth/index.js';
import { type SystemSettingsResponse, toSystemSettingsResponse } from './settings.serializer.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  // Ommaviy markaz va karta rekvizitlari ma'lumotlari (mehmon va ota-onalar uchun)
  @Get('public')
  @Public()
  @ApiOperation({ summary: "Ommaviy sozlamalar (markaz ma'lumotlari, karta rekvizitlari)" })
  async getPublic(): Promise<PublicSettings> {
    return this.settings.getPublicSettings();
  }

  @Get()
  @ApiBearerAuth()
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: "To'liq tizim sozlamalari (faqat Director)" })
  async get(): Promise<SystemSettingsResponse> {
    const s = await this.settings.getSettings();
    return toSystemSettingsResponse(s);
  }

  @Patch()
  @ApiBearerAuth()
  @RequirePermission('settings.manage')
  @NoAudit('SettingsService.updateSettings ichida diff bilan yoziladi')
  @ApiOperation({ summary: 'Tizim sozlamalarini yangilash (faqat Director)' })
  async update(
    @ZodBody(UpdateSystemSettingsSchema) body: z.output<typeof UpdateSystemSettingsSchema>,
    @Req() req: FastifyRequest,
  ): Promise<SystemSettingsResponse> {
    const updated = await this.settings.updateSettings(auditContext(req), body);
    return toSystemSettingsResponse(updated);
  }
}
