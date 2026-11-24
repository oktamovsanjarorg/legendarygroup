import { HttpStatus, Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { NotificationType } from '@lg/contracts';
import { type Database, notifications, users } from '@lg/db';
import { renderNotificationTemplate, telegramMessage } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EventHandlers } from '../outbox/index.js';
import { TelegramOutbox } from '../telegram/index.js';
import { NotificationsRepository } from './notifications.repository.js';

const RETRYABLE = new Set(['failed', 'blocked']);

/**
 * Yetkazish holati (T-109, W-22): Telegram natijasi → bildirishnoma holati.
 * - `TelegramChatBlocked` (403) → shu chatdagi navbatdagi/yiqilgan xabarlar `blocked`;
 * - `TelegramSendFailed` (urinishlar tugadi) → `failed`;
 * - qayta yuborish — faqat `failed`/`blocked`, foydalanuvchining joriy Telegram'iga.
 */
@Injectable()
export class NotificationDeliveryService implements OnModuleInit {
  constructor(
    @Inject(NotificationsRepository) private readonly repo: NotificationsRepository,
    @Inject(TelegramOutbox) private readonly telegramOutbox: TelegramOutbox,
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  onModuleInit(): void {
    this.events.on('TelegramChatBlocked', 'notifications.mark-blocked', async (e, tx) => {
      await this.repo.markChatBlocked(e.payload.chatId, 'TelegramChatBlocked', tx);
    });
    this.events.on('TelegramSendFailed', 'notifications.mark-failed', async (e, tx) => {
      await tx
        .update(notifications)
        .set({ status: 'failed', failedReason: e.payload.error })
        .where(eq(notifications.id, e.payload.notificationId));
    });
  }

  async retry(id: string): Promise<void> {
    const notif = await this.repo.findById(id);
    if (!notif) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (!RETRYABLE.has(notif.status)) throw new AppException(HttpStatus.CONFLICT, 'NOT_RETRYABLE');
    const [user] = await this.db
      .select({ telegramId: users.telegramId })
      .from(users)
      .where(eq(users.id, notif.userId));
    // Telefon raqami chat_id emas: Telegram bog'lanmaguncha qayta yuborish ma'nosiz.
    if (!user?.telegramId) throw new AppException(HttpStatus.CONFLICT, 'NO_TELEGRAM');
    const chatId = user.telegramId.toString();
    const rendered = renderNotificationTemplate(
      notif.type as NotificationType,
      notif.payload as Record<string, unknown>,
    );
    await this.telegramOutbox.enqueue({
      method: 'sendMessage',
      chatId,
      payload: telegramMessage(rendered),
      notificationId: notif.id,
    });
    await this.repo.updateStatus(notif.id, 'queued', {
      attempts: notif.attempts + 1,
      failedReason: null,
      recipient: chatId,
    });
  }
}
