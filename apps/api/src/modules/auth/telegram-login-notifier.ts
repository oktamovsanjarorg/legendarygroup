import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { botMessages as t } from '@lg/i18n';
import { EventHandlers } from '../outbox/index.js';
import { TelegramOutbox } from '../telegram/index.js';
import { StaffUsers } from './staff-users.js';

/** Bot `callback_data` prefiksi (≤ 64 bayt: `tgl:` + UUID). Bot shu prefiks bilan ushlaydi. */
export const TELEGRAM_LOGIN_CALLBACK = 'tgl:';

/**
 * "Telegram orqali kirish" (ADR 0006 §6): `StaffTelegramLoginRequested` → xodimning Telegram'iga
 * "Tasdiqlash" tugmali xabar (navbat orqali). Tugma → bot → `/internal/auth/telegram/confirm`.
 * Dedupe — challenge bo'yicha (hodisa qayta yetkazilsa, xabar takrorlanmaydi).
 */
@Injectable()
export class TelegramLoginNotifier implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(TelegramOutbox) private readonly outbox: TelegramOutbox,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
  ) {}

  onModuleInit(): void {
    this.events.on('StaffTelegramLoginRequested', 'auth.telegram-login-prompt', async (e) => {
      const user = await this.staff.byId(e.payload.userId);
      if (!user?.telegramId) return;
      await this.outbox.enqueue(
        {
          method: 'sendMessage',
          chatId: user.telegramId.toString(),
          payload: {
            text: `<b>${t.staffLogin.title}</b>\n\n${t.staffLogin.body}`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: t.staffLogin.confirmButton,
                    callback_data: `${TELEGRAM_LOGIN_CALLBACK}${e.payload.challengeId}`,
                  },
                ],
              ],
            },
          },
        },
        { dedupeKey: `tg-login-${e.payload.challengeId}` },
      );
    });
  }
}
