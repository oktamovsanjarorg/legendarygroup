import { Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { StaffInviteCheckRequest, TelegramContactRequest } from '@lg/contracts';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard.js';
import { StaffLinkService } from './staff-link.service.js';

/** Bot uchun ichki endpoint'lar (T-101): ustoz taklifi va kontakt orqali bog'lash. */
@Public()
@NoAudit('StaffLinkService ichida')
@ApiTags('Internal')
@ApiSecurity('internal-token')
@UseGuards(InternalTokenGuard)
@Controller('internal/staff')
export class InternalStaffController {
  constructor(@Inject(StaffLinkService) private readonly link: StaffLinkService) {}

  @Post('invite/check')
  @HttpCode(HttpStatus.OK)
  check(@ZodBody(StaffInviteCheckRequest) body: z.output<typeof StaffInviteCheckRequest>) {
    return this.link.check(body.token);
  }

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  contact(@ZodBody(TelegramContactRequest) body: z.output<typeof TelegramContactRequest>) {
    return this.link.linkByContact(body);
  }
}
