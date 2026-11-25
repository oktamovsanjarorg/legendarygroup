import { AssistantChatRequest, type AssistantChatResponse } from '@lg/contracts';
import { Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { RateLimiter, type RateLimit } from '../../common/rate-limit/rate-limiter.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { PermissionsService } from '../rbac/index.js';
import { AssistantService } from './assistant.service.js';

/** Bir xodim — 60 savol / soat (xarajat va suiisteʼmol chegarasi). */
const ASK_LIMIT: RateLimit = { scope: 'assistant', limit: 60, windowS: 60 * 60 };

/**
 * AI yordamchi (Q-114): Director/Admin (`student.manage` — ustoz/ota-onada `stats.operational` ham bor). Faqat o'qiydi — yozish amali
 * yo'q, shuning uchun audit yozuvi ham yo'q; ekran tugmasi odatdagi forma orqali (u yerda audit).
 */
@ApiTags('Assistant')
@ApiBearerAuth()
@Controller('assistant')
export class AssistantController {
  constructor(
    @Inject(AssistantService) private readonly assistant: AssistantService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  @Get('status')
  @RequirePermission('student.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Yordamchi yoqilganmi (kalit sozlanganmi)' })
  status(): { enabled: boolean } {
    return { enabled: this.assistant.enabled };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('Faqat oʻqish: yozish amali yoʻq')
  @ApiOperation({ summary: 'Savol → javob va ekran tugmalari (Q-114)' })
  async chat(
    @CurrentUser() user: RequestUser,
    @ZodBody(AssistantChatRequest) body: z.output<typeof AssistantChatRequest>,
  ): Promise<AssistantChatResponse> {
    await this.limiter.hit(ASK_LIMIT, user.id);
    const perms = await this.permissions.forUser(user.id, user.role, user.pv);
    return this.assistant.chat(user, perms, body);
  }
}
