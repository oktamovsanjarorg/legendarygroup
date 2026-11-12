import { Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicLeadRequest } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../../common/audit/audit.decorator.js';
import { auditContext } from '../../../common/audit/request-context.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ZodBody } from '../../../common/decorators/zod.decorators.js';
import { type RateLimit, RateLimiter } from '../../../common/rate-limit/rate-limiter.js';
import { LeadsService } from './leads.service.js';

export const PUBLIC_LEAD_LIMITS = {
  ip: { scope: 'lead:ip', limit: 5, windowS: 3600 },
  phone: { scope: 'lead:phone', limit: 3, windowS: 86_400 },
} satisfies Record<string, RateLimit>;

/**
 * Landing formasi (W-35, T-503): autentifikatsiyasiz. Spam himoyasi — IP va telefon bo'yicha
 * limit (429), bot tuzog'i (`website`). Javob har doim bir xil (202) — ochiq lid bor-yo'qligi
 * oshkor qilinmaydi.
 */
@Public()
@ApiTags('Public')
@Controller('public/leads')
export class PublicLeadsController {
  constructor(
    @Inject(LeadsService) private readonly leads: LeadsService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @NoAudit('LeadsService ichida (aktorsiz)')
  @ApiOperation({ summary: 'Saytdan ariza (lid, manba — website)' })
  async submit(
    @ZodBody(PublicLeadRequest) body: z.output<typeof PublicLeadRequest>,
    @Req() req: FastifyRequest,
  ): Promise<{ accepted: true }> {
    const ctx = auditContext(req);
    await this.limiter.hit(PUBLIC_LEAD_LIMITS.ip, ctx.ip ?? 'unknown');
    await this.limiter.hit(PUBLIC_LEAD_LIMITS.phone, body.phone);
    if (body.website) return { accepted: true };
    await this.leads.createPublic(ctx, body);
    return { accepted: true };
  }
}
