import { Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { BotGuardianContactRequest, BotTelegramStatusRequest } from '@lg/contracts';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard.js';
import { GuardianLinkService } from './guardian-link.service.js';

/** Bot uchun ichki endpoint'lar (T-110): ota-onani tekshirish va kontakt orqali bog'lash. */
@Public()
@NoAudit('GuardianLinkService ichida')
@ApiTags('Internal')
@ApiSecurity('internal-token')
@UseGuards(InternalTokenGuard)
@Controller('internal/guardian')
export class InternalGuardianController {
  constructor(@Inject(GuardianLinkService) private readonly link: GuardianLinkService) {}

  @Post('status')
  @HttpCode(HttpStatus.OK)
  status(@ZodBody(BotTelegramStatusRequest) body: z.output<typeof BotTelegramStatusRequest>) {
    return this.link.checkTelegramStatus(body.telegramId);
  }

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  contact(@ZodBody(BotGuardianContactRequest) body: z.output<typeof BotGuardianContactRequest>) {
    return this.link.linkGuardianByContact(body);
  }
}
