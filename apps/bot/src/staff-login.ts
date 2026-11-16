import { botMessages as t } from '@lg/i18n';
import type { Bot } from 'grammy';
import type { InternalApi } from './internal-api.js';

/** API `TELEGRAM_LOGIN_CALLBACK` bilan bir xil (`tgl:` + challenge UUID). */
const CALLBACK = /^tgl:([0-9a-f-]{36})$/;

/**
 * "Telegram orqali kirish" (ADR 0006 §6): worker yuborgan xabardagi «Tasdiqlash» → API tasdig'i.
 * Kim bosgani (`from.id`) API'da xodimning Telegram ID'si bilan solishtiriladi. Javob — update
 * kontekstida (`answerCallbackQuery` + xabarni tahrirlash: tugma qayta bosilmaydi).
 */
export function registerStaffLogin(bot: Bot, api: InternalApi): void {
  bot.callbackQuery(CALLBACK, async (ctx) => {
    const challengeId = ctx.match[1] ?? '';
    const ok = await api.confirmTelegramLogin(challengeId, ctx.from.id);
    const text = ok ? t.staffLogin.confirmed : t.staffLogin.expired;
    await ctx.answerCallbackQuery({ text });
    await ctx.editMessageText(text).catch(() => undefined);
  });
}
