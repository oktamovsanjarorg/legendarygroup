import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthUser, LoginResult, RoleCode } from '@lg/contracts';
import { type Database, staffInvites, users } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { type RateLimit, RateLimiter } from '../../common/rate-limit/rate-limiter.js';
import { OutboxService } from '../outbox/index.js';
import { burnPasswordCheck, hashPassword, sha256, verifyPassword } from './crypto.js';
import { type ClientMeta, SessionsService } from './sessions.service.js';
import {
  defaultWebRole,
  maskPhone,
  StaffUsers,
  type StaffUser,
  toAuthUser,
} from './staff-users.js';
import { TokensService } from './tokens.service.js';
import { TotpService } from './totp.service.js';

/** 07 §3: login 5/daq (telefon bo'yicha) + IP bo'yicha keng chegara. */
export const LIMITS = {
  loginPhone: { scope: 'login:phone', limit: 5, windowS: 60 },
  loginIp: { scope: 'login:ip', limit: 30, windowS: 60 },
  totp: { scope: 'login:totp', limit: 5, windowS: 60 },
} satisfies Record<string, RateLimit>;

export interface Issued {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const fail = (
  code: 'INVALID_CREDENTIALS' | 'INVALID_MFA_TOKEN' | 'INVALID_TOTP' | 'INVALID_INVITE',
) => new AppException(HttpStatus.UNAUTHORIZED, code);

/** Xodimlar (web) autentifikatsiyasi — T-006, FR-AUTH-3/4. */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(TotpService) private readonly totp: TotpService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
  ) {}

  /** 1-qadam: telefon + parol → MFA bosqichi (Director/Admin uchun 2FA majburiy). */
  async login(phone: string, password: string, ctx: AuditContext): Promise<LoginResult> {
    await this.limiter.hit(LIMITS.loginIp, ctx.ip ?? 'unknown');
    await this.limiter.hit(LIMITS.loginPhone, phone);

    const user = await this.staff.byPhone(phone);
    const ok = user?.passwordHash
      ? await verifyPassword(user.passwordHash, password)
      : (await burnPasswordCheck(password), false);
    if (!user || !ok || !defaultWebRole(user.roles)) {
      await this.audit.record(ctx, {
        action: 'auth.login_failed',
        entity: 'user',
        entityId: user?.id ?? null,
        after: { phone: maskPhone(phone), reason: !user ? 'unknown' : !ok ? 'password' : 'role' },
      });
      throw fail('INVALID_CREDENTIALS');
    }
    if (user.status !== 'active') throw new AppException(HttpStatus.FORBIDDEN, 'ACCOUNT_BLOCKED');
    await this.limiter.reset(LIMITS.loginPhone, phone);
    return this.mfaStep(user);
  }

  /** 2-qadam (birinchi marta): TOTP sozlash — QR uchun `otpauth://` URL. */
  async beginTotpSetup(mfaToken: string) {
    const user = await this.mfaUser(mfaToken, 'totp_setup');
    if (user.totpSecret) throw new AppException(HttpStatus.CONFLICT, 'TOTP_ALREADY_ENABLED');
    return this.totp.beginSetup(user.id, user.phone);
  }

  /** TOTP'ni yoqish: kod to'g'ri bo'lsa — sir saqlanadi, 10 zaxira kod, sessiya. */
  async enableTotp(mfaToken: string, code: string, ctx: AuditContext, meta: ClientMeta) {
    const user = await this.mfaUser(mfaToken, 'totp_setup');
    if (user.totpSecret) throw new AppException(HttpStatus.CONFLICT, 'TOTP_ALREADY_ENABLED');
    const sealed = await this.totp.confirmSetup(user.id, code);
    if (!sealed) throw fail('INVALID_TOTP');
    const backupCodes = await this.db.transaction(async (tx) => {
      await tx.update(users).set({ totpSecret: sealed }).where(eq(users.id, user.id));
      const codes = await this.totp.regenerateBackupCodes(user.id, tx);
      await this.audit.record(
        { ...ctx, actorId: user.id },
        { action: 'auth.totp_enabled', entity: 'user', entityId: user.id },
        tx,
      );
      return codes;
    });
    return { ...(await this.issue(user, { meta, ctx, method: 'totp_setup' })), backupCodes };
  }

  /** 2-qadam: TOTP kodi yoki zaxira kod → sessiya. */
  async verifyTotp(
    mfaToken: string,
    proof: { code: string } | { backupCode: string },
    ctx: AuditContext,
    meta: ClientMeta,
  ): Promise<Issued> {
    const user = await this.mfaUser(mfaToken, 'totp');
    await this.limiter.hit(LIMITS.totp, user.id);
    const ok =
      'code' in proof
        ? Boolean(user.totpSecret) &&
          (await this.totp.verify(user.id, user.totpSecret ?? '', proof.code))
        : await this.totp.consumeBackupCode(user.id, proof.backupCode);
    if (!ok) {
      await this.audit.record(
        { ...ctx, actorId: user.id },
        {
          action: 'auth.login_failed',
          entity: 'user',
          entityId: user.id,
          after: { reason: 'totp' },
        },
      );
      throw fail('INVALID_TOTP');
    }
    await this.limiter.reset(LIMITS.totp, user.id);
    return this.issue(user, { meta, ctx, method: 'code' in proof ? 'totp' : 'backup_code' });
  }

  /** Taklif havolasi (staff_invites): parol o'rnatish → MFA bosqichi. Bir martalik, 24 soat. */
  async acceptInvite(token: string, password: string, ctx: AuditContext): Promise<LoginResult> {
    const now = this.clock.now();
    const passwordHash = await hashPassword(password);
    const userId = await this.db.transaction(async (tx) => {
      const [invite] = await tx
        .update(staffInvites)
        .set({ usedAt: now })
        .where(
          and(
            eq(staffInvites.tokenHash, sha256(token)),
            isNull(staffInvites.usedAt),
            gt(staffInvites.expiresAt, now),
          ),
        )
        .returning({ userId: staffInvites.userId });
      if (!invite) return null;
      await tx.update(users).set({ passwordHash }).where(eq(users.id, invite.userId));
      await this.audit.record(
        { ...ctx, actorId: invite.userId },
        { action: 'auth.invite_accepted', entity: 'user', entityId: invite.userId },
        tx,
      );
      return invite.userId;
    });
    const user = userId ? await this.staff.byId(userId) : undefined;
    if (!user || user.status !== 'active' || !defaultWebRole(user.roles))
      throw fail('INVALID_INVITE');
    return this.mfaStep(user);
  }

  /** Sessiya + access token (sessiya yaratish va audit). */
  async issue(
    user: StaffUser,
    {
      meta,
      ctx,
      method,
      role,
    }: { meta: ClientMeta; ctx: AuditContext; method: string; role?: RoleCode },
  ): Promise<Issued> {
    const activeRole = role ?? defaultWebRole(user.roles);
    if (!activeRole) throw fail('INVALID_CREDENTIALS');
    const session = await this.sessions.create(user.id, activeRole, meta);
    await this.audit.record(
      { ...ctx, actorId: user.id, actorRole: activeRole },
      { action: 'auth.login', entity: 'session', entityId: session.sessionId, after: { method } },
    );
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      role: activeRole,
      sid: session.sessionId,
      pv: user.permissionsVersion,
    });
    return { accessToken, refreshToken: session.refreshToken, user: toAuthUser(user, activeRole) };
  }

  /** Refresh token o'g'irligi belgisi: oila bekor qilingan; xodimga ogohlantirish (event) + audit. */
  async onReuse(userId: string, familyId: string, ctx: AuditContext): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.outbox.publish('StaffSessionReuseDetected', { userId, familyId }, tx);
      await this.audit.record(
        { ...ctx, actorId: userId },
        { action: 'auth.session_reuse', entity: 'session', after: { familyId } },
        tx,
      );
    });
  }

  async logout(refreshToken: string, ctx: AuditContext): Promise<void> {
    await this.sessions.revokeByRefresh(refreshToken);
    await this.audit.record(ctx, { action: 'auth.logout', entity: 'session' });
  }

  private async mfaStep(user: StaffUser): Promise<LoginResult> {
    const step = user.totpSecret ? 'totp' : 'totp_setup';
    return { next: step, mfaToken: await this.tokens.signMfa({ sub: user.id, step }) };
  }

  private async mfaUser(mfaToken: string, step: 'totp' | 'totp_setup'): Promise<StaffUser> {
    const claims = await this.tokens.verifyMfa(mfaToken);
    const user = claims?.step === step ? await this.staff.byId(claims.sub) : undefined;
    if (!user || user.status !== 'active') throw fail('INVALID_MFA_TOKEN');
    return user;
  }
}
