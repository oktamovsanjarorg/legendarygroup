import { Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  TelegramAuthRequest,
  TelegramLoginPollRequest,
  TelegramLoginStartRequest,
} from '@lg/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { AppException } from '../../common/errors/app.exception.js';
import { auditContext, clientMeta } from './access-token.guard.js';
import { AuthService, type Issued } from './auth.service.js';
import { REFRESH_TTL_MS, SessionsService } from './sessions.service.js';
import { StaffUsers, toAuthUser } from './staff-users.js';
import { TelegramAuthService } from './telegram-auth.service.js';
import { TelegramLoginService } from './telegram-login.service.js';
import { TokensService } from './tokens.service.js';

export const REFRESH_COOKIE = 'lg_rt';
/** Cookie faqat auth endpoint'lariga yuboriladi (httpOnly, Secure, SameSite=Strict — T-006 AC). */
const COOKIE = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/auth',
} as const;

const setRefresh = (reply: FastifyReply, token: string) =>
  reply.setCookie(REFRESH_COOKIE, token, { ...COOKIE, maxAge: REFRESH_TTL_MS / 1000 });

/** Sessiya berilgan javob: refresh — cookie'da, access — body'da. */
export const done = (reply: FastifyReply, issued: Issued) => {
  setRefresh(reply, issued.refreshToken);
  return { next: 'done' as const, accessToken: issued.accessToken, user: issued.user };
};

@Public()
@NoAudit('AuthService/TelegramLoginService ichida')
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(TelegramLoginService) private readonly telegram: TelegramLoginService,
    @Inject(TelegramAuthService) private readonly miniApp: TelegramAuthService,
  ) {}

  /** Mini App (T-007): initData → access token (sessiyasiz, 15 daq). */
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mini App: Telegram initData → access token' })
  telegramMiniApp(
    @ZodBody(TelegramAuthRequest) body: z.output<typeof TelegramAuthRequest>,
    @Req() req: FastifyRequest,
  ) {
    return this.miniApp.exchange(body.initData, body.role, auditContext(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh rotatsiyasi (cookie)' })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = req.cookies[REFRESH_COOKIE];
    const result = token
      ? await this.sessions.rotate(token, clientMeta(req))
      : { kind: 'invalid' as const };
    if (result.kind === 'reuse') {
      await this.auth.onReuse(result.userId, result.familyId, auditContext(req));
      reply.clearCookie(REFRESH_COOKIE, COOKIE);
      throw new AppException(HttpStatus.UNAUTHORIZED, 'SESSION_REVOKED');
    }
    const user = result.kind === 'ok' ? await this.staff.byId(result.session.userId) : undefined;
    if (result.kind !== 'ok' || !user) {
      reply.clearCookie(REFRESH_COOKIE, COOKIE);
      throw new AppException(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED');
    }
    const { session } = result;
    setRefresh(reply, session.refreshToken);
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      role: session.role,
      sid: session.sessionId,
      pv: user.permissionsVersion,
    });
    return { accessToken, user: toAuthUser(user, session.role) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await this.auth.logout(token, auditContext(req));
    reply.clearCookie(REFRESH_COOKIE, COOKIE);
  }

  @Post('telegram/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Telegram orqali kirish: botga tasdiq so'rovi" })
  telegramStart(
    @ZodBody(TelegramLoginStartRequest) body: z.output<typeof TelegramLoginStartRequest>,
    @Req() req: FastifyRequest,
  ) {
    return this.telegram.start(body.phone, req.ip ?? null);
  }

  @Post('telegram/poll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Telegram tasdig'ini kutish → sessiya" })
  async telegramPoll(
    @ZodBody(TelegramLoginPollRequest) body: z.output<typeof TelegramLoginPollRequest>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return done(
      reply,
      await this.telegram.poll(body.challengeId, clientMeta(req), auditContext(req)),
    );
  }
}
