import { Inject, Injectable } from '@nestjs/common';
import type { RoleCode } from '@lg/contracts';
import { type Database, sessions, users } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { randomToken, sha256 } from './crypto.js';

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // FR-AUTH-4: 30 kun

export type { ClientMeta } from '../../common/audit/request-context.js';
import type { ClientMeta } from '../../common/audit/request-context.js';

export interface IssuedSession {
  sessionId: string;
  refreshToken: string;
  userId: string;
  role: RoleCode;
}

export type RotateResult =
  | { kind: 'ok'; session: IssuedSession }
  | { kind: 'invalid' }
  /** Almashtirilgan token qayta keldi — o'g'irlik belgisi; butun oila bekor qilindi. */
  | { kind: 'reuse'; userId: string; familyId: string };

/** Web panel sessiyalari (05: `sessions` — faqat web). Refresh token — opaque, DB'da hash. */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async create(
    userId: string,
    role: RoleCode,
    meta: ClientMeta,
    familyId = uuidv7(),
  ): Promise<IssuedSession> {
    const refreshToken = randomToken();
    const now = this.clock.now();
    const [row] = await this.db
      .insert(sessions)
      .values({
        userId,
        activeRole: role,
        refreshTokenHash: sha256(refreshToken),
        familyId,
        device: meta.device?.slice(0, 300) ?? null,
        ip: meta.ip,
        createdAt: now,
        expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
      })
      .returning({ id: sessions.id });
    if (!row) throw new Error('sessiya yaratilmadi');
    return { sessionId: row.id, refreshToken, userId, role };
  }

  /** Rotatsiya (FR-AUTH-4): eski token bekor, yangi token shu oilada. Qator qulflanadi. */
  async rotate(refreshToken: string, meta: ClientMeta): Promise<RotateResult> {
    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ s: sessions, status: users.status })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(eq(sessions.refreshTokenHash, sha256(refreshToken)))
        .for('update', { of: sessions });
      if (!current) return { kind: 'invalid' } as const;
      const { s } = current;
      if (s.revokedAt) {
        // Logout/bekor qilingan oila tokeni — shunchaki tugagan. O'g'irlik: ALMASHTIRILGAN token
        // qayta keldi va oilada hali faol sessiya bor (haqiqiy egasi foydalanmoqda).
        const [active] = s.replacedAt
          ? await tx
              .select({ id: sessions.id })
              .from(sessions)
              .where(and(eq(sessions.familyId, s.familyId), isNull(sessions.revokedAt)))
              .limit(1)
          : [];
        if (!active) return { kind: 'invalid' } as const;
        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.familyId, s.familyId), isNull(sessions.revokedAt)));
        return { kind: 'reuse', userId: s.userId, familyId: s.familyId } as const;
      }
      if (s.expiresAt <= now || current.status !== 'active') return { kind: 'invalid' } as const;

      await tx
        .update(sessions)
        .set({ revokedAt: now, replacedAt: now })
        .where(eq(sessions.id, s.id));
      const next = randomToken();
      const [row] = await tx
        .insert(sessions)
        .values({
          userId: s.userId,
          activeRole: s.activeRole,
          refreshTokenHash: sha256(next),
          familyId: s.familyId,
          device: meta.device?.slice(0, 300) ?? s.device,
          ip: meta.ip ?? s.ip,
          createdAt: now,
          expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
        })
        .returning({ id: sessions.id });
      if (!row) throw new Error('sessiya yaratilmadi');
      return {
        kind: 'ok',
        session: { sessionId: row.id, refreshToken: next, userId: s.userId, role: s.activeRole },
      } as const;
    });
  }

  /** Joriy sessiya oilasini bekor qiladi (logout). */
  async revokeByRefresh(refreshToken: string): Promise<void> {
    const [s] = await this.db
      .select({ familyId: sessions.familyId })
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, sha256(refreshToken)));
    if (s) await this.revokeFamily(s.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: this.clock.now() })
      .where(and(eq(sessions.familyId, familyId), isNull(sessions.revokedAt)));
  }

  /** Bitta sessiya (qurilma) — faqat o'ziniki. Qaytaradi: topildimi. */
  async revokeOwn(userId: string, sessionId: string): Promise<boolean> {
    const [s] = await this.db
      .select({ familyId: sessions.familyId })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    if (!s) return false;
    await this.revokeFamily(s.familyId);
    return true;
  }

  /** "Barcha qurilmalardan chiqish" (FR-AUTH-7) va bloklash (02 §1). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: this.clock.now() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  /** Faol sessiyalar (har oila — oxirgi tokeni). */
  async listActive(userId: string) {
    return this.db
      .select({
        id: sessions.id,
        familyId: sessions.familyId,
        device: sessions.device,
        ip: sessions.ip,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, this.clock.now()),
        ),
      )
      .orderBy(desc(sessions.createdAt));
  }

  /** Access token tekshiruvi: sessiya faol, foydalanuvchi faol, ruxsatlar versiyasi mos. */
  /** Faol rolni almashtirish (02 §1: ruxsatlar birlashtirilmaydi) — sessiyaning o'zida. */
  async switchRole(sessionId: string, role: RoleCode): Promise<void> {
    await this.db.update(sessions).set({ activeRole: role }).where(eq(sessions.id, sessionId));
  }

  /**
   * Access token tekshiruvi: sessiya faol, foydalanuvchi faol, ruxsatlar versiyasi va faol rol mos
   * (rol almashtirilgach eski rolli token ishlamaydi).
   */
  async isAccessValid(
    sessionId: string,
    userId: string,
    pv: number,
    role: RoleCode,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ pv: users.permissionsVersion })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          eq(sessions.activeRole, role),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, this.clock.now()),
          eq(users.status, 'active'),
        ),
      );
    return row?.pv === pv;
  }
}
