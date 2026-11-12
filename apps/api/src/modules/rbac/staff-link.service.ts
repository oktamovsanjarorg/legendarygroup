import { Inject, Injectable } from '@nestjs/common';
import type { StaffInviteCheckResult, TelegramContactResult } from '@lg/contracts';
import { type Database, staffInvites, users } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { sha256 } from '../auth/index.js';

/** Telegram kontakt raqami ba'zan `+`siz keladi: faqat raqamlar → E.164. */
export const normalizePhone = (raw: string): string => `+${raw.replace(/\D/g, '')}`;

/**
 * Ustozni Telegram'ga bog'lash (T-101): `/start inv_<token>` → kontakt ulashish.
 * Bog'lash faqat shu raqamda **amaldagi bot taklifi** bo'lsa (taklifsiz — ota-ona oqimi, T-110).
 * Kontakt egasi tekshiruvi (`contact.user_id === from.id`) — botda.
 */
@Injectable()
export class StaffLinkService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private activeBotInvite(now: Date) {
    return and(
      eq(staffInvites.channel, 'bot'),
      isNull(staffInvites.usedAt),
      gt(staffInvites.expiresAt, now),
    );
  }

  async check(token: string): Promise<StaffInviteCheckResult> {
    const [row] = await this.db
      .select({ fullName: users.fullName, status: users.status })
      .from(staffInvites)
      .innerJoin(users, eq(users.id, staffInvites.userId))
      .where(
        and(eq(staffInvites.tokenHash, sha256(token)), this.activeBotInvite(this.clock.now())),
      );
    return row && row.status === 'active'
      ? { valid: true, fullName: row.fullName }
      : { valid: false };
  }

  async linkByContact(input: {
    telegramId: bigint;
    phone: string;
    username?: string;
  }): Promise<TelegramContactResult> {
    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.phone, normalizePhone(input.phone)))
        .for('update');
      if (!user || user.status !== 'active') return { result: 'not_found' };
      if (user.telegramId === input.telegramId)
        return { result: 'already_linked', fullName: user.fullName };
      // Boshqa Telegram'ga bog'langan raqam yoki bu Telegram boshqa foydalanuvchida — egallab bo'lmaydi.
      if (user.telegramId !== null) return { result: 'not_found' };
      const [taken] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.telegramId, input.telegramId));
      if (taken) return { result: 'not_found' };
      const [invite] = await tx
        .update(staffInvites)
        .set({ usedAt: now })
        .where(and(eq(staffInvites.userId, user.id), this.activeBotInvite(now)))
        .returning({ id: staffInvites.id });
      if (!invite) return { result: 'not_found' };
      await tx
        .update(users)
        .set({ telegramId: input.telegramId, telegramUsername: input.username ?? null })
        .where(eq(users.id, user.id));
      await this.audit.record(
        { actorId: user.id, actorRole: null, ip: null, userAgent: null, requestId: null },
        { action: 'staff.telegram_linked', entity: 'user', entityId: user.id },
        tx,
      );
      return { result: 'staff_linked', fullName: user.fullName };
    });
  }
}
