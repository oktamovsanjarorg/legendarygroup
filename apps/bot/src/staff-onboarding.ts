import { botMessages as t } from '@lg/i18n';
import { type Bot, type Context, type InlineKeyboard, Keyboard } from 'grammy';
import type { InternalApi } from './internal-api.js';

/** `/start inv_<token>` (T-101: API'dagi `BOT_INVITE_PREFIX` bilan bir xil). */
export const INVITE_PREFIX = 'inv_';

const shareKeyboard = () =>
  new Keyboard().requestContact(t.staffInvite.shareButton).resized().oneTime();

async function onInvite(ctx: Context, api: InternalApi, token: string): Promise<void> {
  const r = await api.checkStaffInvite(token);
  if (!r.valid) {
    await ctx.reply(t.staffInvite.invalid);
    return;
  }
  await ctx.reply(
    `<b>${t.staffInvite.greeting.replace('{name}', escapeHtml(r.fullName))}</b>\n${t.staffInvite.body}`,
    {
      parse_mode: 'HTML',
      reply_markup: shareKeyboard(),
    },
  );
}

const escapeHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * Ustozni ulash (T-101): taklif tekshiruvi → telefon ulashish → API bog'laydi.
 * Kontakt faqat O'ZIniki bo'lishi shart (`contact.user_id === from.id`) — Telegram raqam
 * egasini kafolatlaydi; boshqa birovning kontakti rad etiladi.
 */
export function registerStaffOnboarding(
  bot: Bot,
  api: InternalApi,
  openApp: () => InlineKeyboard,
): void {
  bot.command('start', async (ctx, next) => {
    const param = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    if (!param.startsWith(INVITE_PREFIX)) return next();
    await onInvite(ctx, api, param.slice(INVITE_PREFIX.length));
  });

  bot.on('message:contact', async (ctx) => {
    const { contact } = ctx.message;
    if (contact.user_id !== ctx.from.id) {
      await ctx.reply(t.staffInvite.notOwn, { reply_markup: shareKeyboard() });
      return;
    }
    const r = await api.shareContact({
      telegramId: ctx.from.id,
      phone: contact.phone_number,
      username: ctx.from.username,
    });
    if (r.result === 'not_found') {
      await ctx.reply(t.staffInvite.notFound, { reply_markup: { remove_keyboard: true } });
      return;
    }
    await ctx.reply(
      `<b>${t.staffInvite.linked.replace('{name}', escapeHtml(r.fullName ?? ''))}</b>`,
      {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
      },
    );
    await ctx.reply(t.staffInvite.linkedBody, { reply_markup: openApp() });
  });
}
