import { Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PanelHandoffRedeemRequest, type PanelHandoffResult } from '@lg/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { Authenticated } from '../../common/decorators/access.decorators.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { auditContext, clientMeta, CurrentUser, type RequestUser } from './access-token.guard.js';
import { done } from './auth.controller.js';
import { PanelHandoffService } from './panel-handoff.service.js';

/** Mini App'dan web panelga bir bosishda o'tish (T-121). */
@NoAudit('PanelHandoffService/AuthService ichida')
@ApiTags('Auth')
@Controller('auth/panel-handoff')
export class PanelHandoffController {
  constructor(@Inject(PanelHandoffService) private readonly handoff: PanelHandoffService) {}

  /** Rol tekshiruvi (faqat Director/Admin) — service'da: web paneli faqat shu rollarniki. */
  @Post()
  @Authenticated()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mini App: web panel uchun bir martalik kalit (60 s)' })
  issue(@CurrentUser() user: RequestUser, @Req() req: FastifyRequest): Promise<PanelHandoffResult> {
    return this.handoff.issue(user, auditContext(req));
  }

  /** Ochiq: kalitning o'zi — autentifikatsiya (bir martalik, IP bo'yicha cheklangan). */
  @Post('redeem')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Web: kalit → sessiya (refresh cookie)' })
  async redeem(
    @ZodBody(PanelHandoffRedeemRequest) body: z.output<typeof PanelHandoffRedeemRequest>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return done(reply, await this.handoff.redeem(body.token, clientMeta(req), auditContext(req)));
  }
}
