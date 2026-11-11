import { Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { TelegramLoginConfirmRequest } from '@lg/contracts';
import type { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard.js';
import { TelegramLoginService } from './telegram-login.service.js';

/** Bot uchun ichki endpoint (`/internal/*`, prefiksiz — tashqariga chiqmaydi). */
@Public()
@ApiTags('Internal')
@ApiSecurity('internal-token')
@UseGuards(InternalTokenGuard)
@Controller('internal/auth')
export class InternalAuthController {
  constructor(@Inject(TelegramLoginService) private readonly telegram: TelegramLoginService) {}

  @Post('telegram/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @ZodBody(TelegramLoginConfirmRequest) body: z.output<typeof TelegramLoginConfirmRequest>,
  ) {
    return { confirmed: await this.telegram.confirm(body.challengeId, body.telegramId) };
  }
}
