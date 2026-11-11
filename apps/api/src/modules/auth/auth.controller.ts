import { Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  InviteAcceptRequest,
  LoginRequest,
  type LoginResult,
  MfaRequest,
  TelegramLoginPollRequest,
  TelegramLoginStartRequest,
  TotpEnableRequest,
  TotpVerifyRequest,
} from '@lg/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { AppException } from '../../common/errors/app.exception.js';
import { auditContext, clientMeta } from './access-token.guard.js';
import { AuthService, type Issued } from './auth.service.js';
import { REFRESH_TTL_MS, SessionsService } from './sessions.service.js';
import { StaffUsers, toAuthUser } from './staff-users.js';
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
const done = (reply: FastifyReply, issued: Issued) => {
  setRefresh(reply, issued.refreshToken);
  return { next: 'done' as const, accessToken: issued.accessToken, user: issued.user };
};

@Public()
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(TelegramLoginService) private readonly telegram: TelegramLoginService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telefon + parol → MFA bosqichi' })
  login(
    @ZodBody(LoginRequest) body: z.output<typeof LoginRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LoginResult> {
    return this.auth.login(body.phone, body.password, auditContext(req));
  }

  @Post('invite/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Taklif havolasi: parol o'rnatish" })
  acceptInvite(
    @ZodBody(InviteAcceptRequest) body: z.output<typeof InviteAcceptRequest>,
    @Req() req: FastifyRequest,
  ) {
    return this.auth.acceptInvite(body.token, body.password, auditContext(req));
  }

  @Post('totp/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TOTP sozlash: otpauth:// URL (QR)' })
  totpSetup(@ZodBody(MfaRequest) body: z.output<typeof MfaRequest>) {
    return this.auth.beginTotpSetup(body.mfaToken);
  }

  @Post('totp/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TOTP yoqish → sessiya + zaxira kodlar' })
  async totpEnable(
    @ZodBody(TotpEnableRequest) body: z.output<typeof TotpEnableRequest>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const issued = await this.auth.enableTotp(
      body.mfaToken,
      body.code,
      auditContext(req),
      clientMeta(req),
    );
    return { ...done(reply, issued), backupCodes: issued.backupCodes };
  }

  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TOTP yoki zaxira kod → sessiya' })
  async totpVerify(
    @ZodBody(TotpVerifyRequest) body: z.output<typeof TotpVerifyRequest>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const proof = 'code' in body ? { code: body.code } : { backupCode: body.backupCode };
    return done(
      reply,
      await this.auth.verifyTotp(body.mfaToken, proof, auditContext(req), clientMeta(req)),
    );
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
