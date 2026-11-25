import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthUser, RoleCode } from '@lg/contracts';
import type { Database } from '@lg/db';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { OutboxService } from '../outbox/index.js';
import { type ClientMeta, SessionsService } from './sessions.service.js';
import { defaultWebRole, type StaffUser, toAuthUser } from './staff-users.js';
import { TokensService } from './tokens.service.js';

export interface Issued {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Xodim sessiyalari — T-006, FR-AUTH-4. Kirish faqat Telegram orqali (Q-98, T-147). */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
  ) {}

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
    if (!activeRole) throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS');
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
}
