import { botMessages as t } from '@lg/i18n';
import { Bot, type Context, InlineKeyboard } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { type DedupeStore, dedupeUpdates } from './dedupe.js';
import type { BotEnv } from './env.js';
import type { InternalApi } from './internal-api.js';
import { registerStaffOnboarding } from './staff-onboarding.js';

export interface BotDeps {
  env: Pick<BotEnv, 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_MINIAPP_URL'>;
  store: DedupeStore;
  /** API ichki chaqiruvlari (taklif, kontakt). */
  api: InternalApi;
  log: { error: (obj: unknown, msg: string) => void };
  /** Testlarda: `getMe` so'rovisiz. */
  botInfo?: UserFromGetMe;
}

/** Telegram `web_app` tugmasi faqat HTTPS bilan ishlaydi; lokal http'da — oddiy havola. */
export const isHttps = (url: string): boolean => url.startsWith('https://');

const openAppKeyboard = (url: string): InlineKeyboard =>
  isHttps(url)
    ? new InlineKeyboard().webApp(t.openApp, url)
    : new InlineKeyboard().url(t.openApp, url);

/**
 * Bot — yupqa qatlam (03 §2): biznes mantiq yo'q, DB yo'q. Javob faqat update kontekstida
 * (`ctx.reply`); boshqa barcha xabarlar — worker navbati (`telegram-outbox`) orqali.
 * Xodim ulanishi — T-101; ota-ona ro'yxatdan o'tishi — T-110, chek yuborish — T-206.
 */
export function createBot(deps: BotDeps): Bot {
  const bot = new Bot(deps.env.TELEGRAM_BOT_TOKEN, deps.botInfo ? { botInfo: deps.botInfo } : {});
  const url = deps.env.TELEGRAM_MINIAPP_URL;

  bot.use(dedupeUpdates(deps.store));
  // Onboarding: `/start inv_<token>` (T-101), `/start` (T-110) va kontakt ulashish
  registerStaffOnboarding(bot, deps.api, () => openAppKeyboard(url));
  bot.command('help', (ctx: Context) =>
    ctx.reply(`<b>${t.help.title}</b>\n${t.help.body}`, { parse_mode: 'HTML' }),
  );
  // To'lov cheki (rasm yoki fayl) kelganda — ilovaga yo'naltirish (T-206)
  bot.on(['message:photo', 'message:document'], (ctx: Context) =>
    ctx.reply(`<b>${t.receiptUploadHelp.title}</b>\n\n${t.receiptUploadHelp.body}`, {
      parse_mode: 'HTML',
      reply_markup: openAppKeyboard(url),
    }),
  );
  // Erkin matnli xabarlar uchun yo'naltiruvchi javob
  bot.on('message:text', (ctx: Context) =>
    ctx.reply(`<b>${t.unknownMessage.title}</b>\n\n${t.unknownMessage.body}`, {
      parse_mode: 'HTML',
      reply_markup: openAppKeyboard(url),
    }),
  );

  // Xato bot'ni to'xtatmaydi; foydalanuvchiga qisqa javob, tafsilot — logga (T-016: Sentry).
  bot.catch(async (err) => {
    deps.log.error({ err: err.error, updateId: err.ctx.update.update_id }, 'Bot update xatosi');
    await err.ctx.reply(t.error).catch(() => undefined);
  });
  return bot;
}

/** Chap pastdagi menyu tugmasi → Mini App (faqat HTTPS — Telegram talabi). */
export async function configureMenuButton(bot: Bot, url: string): Promise<boolean> {
  if (!isHttps(url)) return false;
  await bot.api.setChatMenuButton({
    menu_button: { type: 'web_app', text: t.menuButton, web_app: { url } },
  });
  return true;
}
