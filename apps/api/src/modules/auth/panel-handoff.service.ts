import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { PanelHandoffResult, RoleCode } from '@lg/contracts';
import type { Clock } from '@lg/domain';
import type { Redis } from 'ioredis';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { type RateLimit, RateLimiter } from '../../common/rate-limit/rate-limiter.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import { EnvService } from '../../config/env.service.js';
import type { RequestUser } from './access-token.guard.js';
import { AuthService, type Issued } from './auth.service.js';
import { randomToken, sha256 } from './crypto.js';
import type { ClientMeta } from './sessions.service.js';
import { StaffUsers, WEB_ROLES } from './staff-users.js';

/** Kalit umri: tugma bosilgach brauzer ochilishi uchun yetarli, ushlab qolish uchun juda qisqa. */
export const HANDOFF_TTL_S = 60;
const REDEEM_LIMIT: RateLimit = { scope: 'auth:handoff', limit: 10, windowS: 60 };
const key = (token: string) => `auth:handoff:${sha256(token)}`;

const invalid = () => new AppException(HttpStatus.UNAUTHORIZED, 'PANEL_HANDOFF_INVALID');

/**
 * Mini App → web panel (T-121, ADR 0006 §7). Mini App'da Telegram orqali tasdiqlangan Director/
 * Admin bir martalik kalit oladi; web uni sessiyaga almashtiradi. Ikkinchi omil — "Telegram
 * orqali kirish" (FR-AUTH-3) bilan bir xil: Telegram akkauntiga egalik (`initData` HMAC).
 * Redis'da faqat kalit xeshi; olish — GETDEL (bir marta).
 */
@Injectable()
export class PanelHandoffService {
  private readonly appUrl: string;

  constructor(
    @Inject(EnvService) env: EnvService,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {
    this.appUrl = env.get('PUBLIC_APP_URL').replace(/\/$/, '');
  }

  async issue(user: RequestUser, ctx: AuditContext): Promise<PanelHandoffResult> {
    if (!WEB_ROLES.includes(user.role)) throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    const token = randomToken();
    const value = JSON.stringify({ userId: user.id, role: user.role });
    await this.redis.set(key(token), value, 'EX', HANDOFF_TTL_S);
    await this.audit.record(
      { ...ctx, actorId: user.id, actorRole: user.role },
      { action: 'auth.panel_handoff', entity: 'user', entityId: user.id },
    );
    const expiresAt = new Date(this.clock.now().getTime() + HANDOFF_TTL_S * 1000);
    return { url: `${this.appUrl}/handoff#t=${token}`, expiresAt: expiresAt.toISOString() };
  }

  async redeem(token: string, meta: ClientMeta, ctx: AuditContext): Promise<Issued> {
    await this.limiter.hit(REDEEM_LIMIT, ctx.ip ?? 'unknown');
    const raw = await this.redis.getdel(key(token));
    if (!raw) throw invalid();
    const { userId, role } = JSON.parse(raw) as { userId: string; role: RoleCode };
    const user = await this.staff.byId(userId);
    // Kalit berilgandan keyin bloklangan yoki rol olingan bo'lsa — sessiya yo'q.
    if (!user || user.status !== 'active' || !user.roles.includes(role)) throw invalid();
    return this.auth.issue(user, { meta, ctx, method: 'miniapp_handoff', role });
  }
}
