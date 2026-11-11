import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthUser, RoleCode } from '@lg/contracts';
import { type Database, users } from '@lg/db';
import type { Clock } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EnvService } from '../../config/env.service.js';
import { StaffUsers, toAuthUser } from './staff-users.js';
import { verifyInitData } from './telegram-init-data.js';
import { TokensService } from './tokens.service.js';

export type TelegramAuthResult =
  | { next: 'done'; accessToken: string; user: AuthUser }
  | { next: 'choose_role'; roles: RoleCode[] };

/**
 * Mini App kirishi (T-007, FR-AUTH-1/2/5): `initData` (HMAC, ≤ 24 soat) → `telegram_id` →
 * foydalanuvchi → faol rol. Sessiya yaratilmaydi (05: `sessions` — faqat web); token muddati
 * tugasa — joriy `initData` bilan qayta olinadi. Rol almashtirish — shu endpoint `role` bilan.
 * Ro'yxatdan o'tish (telefonni ulashish → bog'lash) — bot, T-110.
 */
@Injectable()
export class TelegramAuthService {
  private readonly botToken: string;

  constructor(
    @Inject(EnvService) env: EnvService,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {
    this.botToken = env.get('TELEGRAM_BOT_TOKEN');
  }

  async exchange(
    initData: string,
    role: RoleCode | undefined,
    ctx: AuditContext,
  ): Promise<TelegramAuthResult> {
    const verified = verifyInitData(initData, this.botToken, this.clock.now().getTime());
    if (!verified.ok)
      throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_INIT_DATA', {
        reason: verified.reason,
      });

    const user = await this.staff.byTelegramId(verified.user.id);
    if (!user || user.roles.length === 0)
      throw new AppException(HttpStatus.UNAUTHORIZED, 'TELEGRAM_NOT_LINKED');
    if (user.status !== 'active') throw new AppException(HttpStatus.FORBIDDEN, 'ACCOUNT_BLOCKED');

    const active = role ?? (user.roles.length === 1 ? user.roles[0] : undefined);
    if (!active) return { next: 'choose_role', roles: user.roles };
    if (!user.roles.includes(active))
      throw new AppException(HttpStatus.FORBIDDEN, 'ROLE_NOT_ASSIGNED');

    // Telegram username o'zgargan bo'lishi mumkin — yangilab boriladi (05: users.telegram_username).
    if (verified.user.username) {
      await this.db
        .update(users)
        .set({ telegramUsername: verified.user.username, lastLoginAt: this.clock.now() })
        .where(eq(users.id, user.id));
    }
    await this.audit.record(
      { ...ctx, actorId: user.id, actorRole: active },
      {
        action: 'auth.login',
        entity: 'user',
        entityId: user.id,
        after: { method: 'telegram_miniapp' },
      },
    );
    const accessToken = await this.tokens.signMiniApp({
      sub: user.id,
      role: active,
      pv: user.permissionsVersion,
    });
    return { next: 'done', accessToken, user: toAuthUser(user, active) };
  }
}
