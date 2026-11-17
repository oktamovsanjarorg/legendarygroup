import { botMessages as t } from '@lg/i18n';
import { type Bot, type Context, type InlineKeyboard, Keyboard } from 'grammy';
import type { BotStore } from './dedupe.js';
import type { InternalApi } from './internal-api.js';

export const STUDENT_CODE_TTL_S = 10 * 60; // 10 daqiqa (D3)
export const studentCodeKey = (tgId: number): string => `student:awaiting_code:${tgId}`;

const shareKeyboard = () =>
  new Keyboard().requestContact(t.parentOnboarding.shareButton).resized().oneTime();

const escapeHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

interface CodeContext {
  ctx: Context;
  api: InternalApi;
  store: BotStore;
  openApp: () => InlineKeyboard;
  text: string;
}

async function handleCodeMessage({ ctx, api, store, openApp, text }: CodeContext): Promise<void> {
  if (!ctx.from) return;
  const key = studentCodeKey(ctx.from.id);
  const phone = await store.get(key);

  if (!phone) {
    await ctx.reply(t.studentLogin.needContact, { reply_markup: shareKeyboard() });
    return;
  }

  const res = await api.linkStudent({
    telegramId: ctx.from.id,
    phone,
    code: text,
  });

  if (res.result === 'linked') {
    await store.del(key);
    await ctx.reply(
      `<b>${t.studentLogin.success.replace('{name}', escapeHtml(res.fullName ?? ''))}</b>`,
      {
        parse_mode: 'HTML',
        reply_markup: openApp(),
      },
    );
    return;
  }

  if (res.result === 'already_linked') {
    await store.del(key);
    await ctx.reply(t.studentLogin.alreadyLinked, { reply_markup: openApp() });
    return;
  }

  if (res.result === 'rate_limited') {
    await ctx.reply(t.studentLogin.rateLimited);
    return;
  }

  await ctx.reply(t.studentLogin.invalidCode);
}

/**
 * Oʻquvchi shaxsiy kod orqali botga kirish oqimi (T-126, D1–D5).
 */
export function registerStudentLogin(
  bot: Bot,
  api: InternalApi,
  store: BotStore,
  openApp: () => InlineKeyboard,
): void {
  // "Men oʻquvchiman" inline tugmasi bosilganda
  bot.callbackQuery('student:enter_code', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.from) return;
    const phone = await store.get(studentCodeKey(ctx.from.id));
    if (!phone) {
      await ctx.reply(t.studentLogin.needContact, { reply_markup: shareKeyboard() });
      return;
    }
    await ctx.reply(t.studentLogin.promptCode);
  });

  // /student buyrugʻi — toʻgʻridan-toʻgʻri oʻquvchi sifatida kirish
  bot.command('student', async (ctx) => {
    if (!ctx.from) return;
    const phone = await store.get(studentCodeKey(ctx.from.id));
    if (!phone) {
      await ctx.reply(t.studentLogin.needContact, { reply_markup: shareKeyboard() });
      return;
    }
    await ctx.reply(t.studentLogin.promptCode);
  });

  // Matnli xabarda 6 xonali kod kiritilganda
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.from || !ctx.message) return next();
    const text = ctx.message.text.trim();
    if (!/^\d{6}$/.test(text)) {
      return next();
    }
    await handleCodeMessage({ ctx, api, store, openApp, text });
  });
}
