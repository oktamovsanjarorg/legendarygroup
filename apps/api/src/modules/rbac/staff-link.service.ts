import { Inject, Injectable } from '@nestjs/common';
import type { TelegramContactResult } from '@lg/contracts';
import { type Database, guardianLinkRequests, users } from '@lg/db';
import { webMessages } from '@lg/i18n';
import type { Clock } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { canClaimTelegram, hasStaffRole } from './telegram-claim.js';

/** Telegram kontakt raqami ba'zan `+`siz keladi: faqat raqamlar → E.164. */
/** Admin navbatida ko'rinadi (i18n). */
const STAFF_LINKED_REASON = webMessages.linkRequests.staffLinkedReason;

export const normalizePhone = (raw: string): string => `+${raw.replace(/\D/g, '')}`;

/**
 * Xodimni Telegram'ga bog'lash (Q-98): botda o'z raqamini ulashish — yetarli, taklif havolasi yo'q.
 * Raqam faol xodimniki bo'lishi shart. Telegram raqamga egalikni tasdiqlaydi; kontakt egasi
 * tekshiruvi (`contact.user_id === from.id`) — botda. Allaqachon boshqa Telegram'ga bog'langan
 * raqam avtomatik ko'chmaydi (SIM qayta sotilishi) — Director uzadi yoki CLI `director:relink`.
 */
@Injectable()
export class StaffLinkService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
      if (!(await hasStaffRole(tx, user.id))) return { result: 'not_found' };
      const verifiedPhone = normalizePhone(input.phone);
      const { telegramId } = input;
      if (!(await canClaimTelegram(tx, { userId: user.id, telegramId, verifiedPhone })))
        return { result: 'conflict' };
      await tx
        .update(users)
        .set({ telegramId: input.telegramId, telegramUsername: input.username ?? null })
        .where(eq(users.id, user.id));
      // Shu Telegram'dan avval (raqam tanilmagan paytda) yuborilgan ota-ona so'rovi — endi
      // ortiqcha: admin navbatida chalg'itmasin.
      await tx
        .update(guardianLinkRequests)
        .set({ status: 'rejected', rejectReason: STAFF_LINKED_REASON, resolvedAt: now })
        .where(
          and(
            eq(guardianLinkRequests.telegramId, input.telegramId),
            eq(guardianLinkRequests.status, 'pending'),
          ),
        );
      await this.audit.record(
        { actorId: user.id, actorRole: null, ip: null, userAgent: null, requestId: null },
        { action: 'staff.telegram_linked', entity: 'user', entityId: user.id },
        tx,
      );
      return { result: 'staff_linked', fullName: user.fullName };
    });
  }
}
