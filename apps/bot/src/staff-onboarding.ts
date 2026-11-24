import { botMessages as t } from '@lg/i18n';
import {
  type Bot,
  type Context,
  type InlineKeyboard,
  Keyboard,
  InlineKeyboard as GrammyInline,
} from 'grammy';
import type { BotStore } from './dedupe.js';
import type { InternalApi } from './internal-api.js';
import { studentCodeKey, STUDENT_CODE_TTL_S, takeStudentIntent } from './student-login.js';

const shareKeyboard = () =>
  new Keyboard().requestContact(t.parentOnboarding.shareButton).resized().oneTime();

const escapeHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function handleLinkedStatus(
  ctx: Context,
  status: { role?: string; fullName?: string; students?: { fullName: string }[] },
  openApp: () => InlineKeyboard,
): Promise<void> {
  if (status.role === 'guardian') {
    const children =
      (status.students ?? []).map((s) => `• ${escapeHtml(s.fullName)}`).join('\n') ||
      t.parentOnboarding.childrenFallback;
    const text = t.parentOnboarding.alreadyLinked
      .replace('{name}', escapeHtml(status.fullName ?? ''))
      .replace('{children}', children);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: openApp() });
    return;
  }
  if (status.role === 'student') {
    const text = t.studentLogin.greeting.replace('{name}', escapeHtml(status.fullName ?? ''));
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: openApp() });
    return;
  }
  const text = t.parentOnboarding.staffGreeting.replace(
    '{name}',
    escapeHtml(status.fullName ?? ''),
  );
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: openApp() });
}

async function onNormalStart(
  ctx: Context,
  api: InternalApi,
  openApp: () => InlineKeyboard,
): Promise<void> {
  if (!ctx.from) return;
  const status = await api.checkStatus(ctx.from.id);

  if (status.status === 'linked') {
    await handleLinkedStatus(ctx, status, openApp);
    return;
  }

  if (status.status === 'pending_approval') {
    await ctx.reply(
      `<b>${t.parentOnboarding.pendingTitle}</b>\n${t.parentOnboarding.pendingBody}`,
      // Raqam tugmasi qoladi: keyin xodim qilib qo'shilgan odam shu yerda tiqilib qolmasin (Q-98)
      { parse_mode: 'HTML', reply_markup: shareKeyboard() },
    );
    return;
  }

  if (status.status === 'rejected') {
    await ctx.reply(
      t.parentOnboarding.rejectedBody.replace('{reason}', escapeHtml(status.rejectReason ?? '')),
      { reply_markup: shareKeyboard() },
    );
    return;
  }

  await ctx.reply(
    `<b>${t.parentOnboarding.welcomeTitle}</b>\n\n${t.parentOnboarding.welcomeBody}`,
    {
      parse_mode: 'HTML',
      reply_markup: shareKeyboard().row().text(t.studentLogin.enterCodeButton),
    },
  );
}

async function handleStaffContact(
  ctx: Context,
  api: InternalApi,
  contact: { phone_number: string },
  openApp: () => InlineKeyboard,
): Promise<boolean> {
  if (!ctx.from) return false;
  const staffRes = await api.shareContact({
    telegramId: ctx.from.id,
    phone: contact.phone_number,
    username: ctx.from.username,
  });

  if (staffRes.result === 'conflict') {
    await ctx.reply(t.staffInvite.conflict, { reply_markup: { remove_keyboard: true } });
    return true;
  }
  if (staffRes.result !== 'staff_linked' && staffRes.result !== 'already_linked') {
    return false;
  }

  await ctx.reply(
    `<b>${t.staffInvite.linked.replace('{name}', escapeHtml(staffRes.fullName ?? ''))}</b>`,
    { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } },
  );
  await ctx.reply(t.staffInvite.linkedBody, { reply_markup: openApp() });
  return true;
}

type GuardianResult = Awaited<ReturnType<InternalApi['shareGuardianContact']>>;

/** Raqam bazada yoʻq — kimligi soʻraladi: oʻquvchi kontakti soxta ota-ona soʻrovi yaratmasin (T-126). */
async function askWhoAreYou(ctx: Context, phone: string): Promise<void> {
  const choice = new GrammyInline()
    .text(t.parentOnboarding.requestButton, 'guardian:request')
    .row()
    .text(t.studentLogin.enterCodeButton, 'student:enter_code');
  await ctx.reply(
    `<b>${t.parentOnboarding.unknownPhoneTitle}</b>\n\n${t.parentOnboarding.unknownPhoneBody.replace('{phone}', escapeHtml(phone))}`,
    { parse_mode: 'HTML', reply_markup: choice },
  );
}

async function replyGuardianLinked(
  ctx: Context,
  res: GuardianResult,
  openApp: () => InlineKeyboard,
): Promise<void> {
  const children =
    (res.students ?? []).map((s) => `• ${escapeHtml(s.fullName)}`).join('\n') ||
    t.parentOnboarding.childrenFallback;
  const name = escapeHtml(res.fullName ?? '');
  const linked = res.result === 'guardian_linked';
  const title = linked
    ? t.parentOnboarding.linkedTitle.replace('{name}', name)
    : t.parentOnboarding.alreadyLinked.replace('{name}', name).replace('{children}', children);
  const body = linked ? t.parentOnboarding.linkedChildren.replace('{children}', children) : '';
  await ctx.reply(`<b>${title}</b>${body ? `\n\n${body}` : ''}`, {
    parse_mode: 'HTML',
    reply_markup: { remove_keyboard: true },
  });
  await ctx.reply(t.openApp, { reply_markup: openApp() });
}

interface GuardianContactInput {
  ctx: Context;
  api: InternalApi;
  phone: string;
  openApp: () => InlineKeyboard;
  /** `false` — topilmasa soʻrov yaratilmaydi, avval kimligi soʻraladi. */
  createRequest: boolean;
}

async function handleGuardianContact(input: GuardianContactInput): Promise<void> {
  const { ctx, api, phone, openApp, createRequest } = input;
  if (!ctx.from) return;
  const fullName =
    [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
  const res = await api.shareGuardianContact({
    telegramId: ctx.from.id,
    phone,
    fullName,
    username: ctx.from.username,
    createRequest,
  });
  if (res.result === 'not_found') {
    await askWhoAreYou(ctx, phone);
    return;
  }
  if (res.result === 'guardian_linked' || res.result === 'already_linked') {
    await replyGuardianLinked(ctx, res, openApp);
    return;
  }
  await ctx.reply(
    `<b>${t.parentOnboarding.requestCreatedTitle}</b>\n\n${t.parentOnboarding.requestCreatedBody.replace('{phone}', escapeHtml(phone))}`,
    { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } },
  );
}

/**
 * Onboarding (T-101 xodim, T-110 ota-ona): telefon raqamni ulashish — yagona kirish yo'li (Q-98).
 */
export function registerStaffOnboarding(
  bot: Bot,
  api: InternalApi,
  openApp: () => InlineKeyboard,
  store: BotStore,
): void {
  // Eski `/start inv_<token>` havolalari ham shu yerga tushadi — token endi kerak emas (Q-98)
  bot.command('start', (ctx) => onNormalStart(ctx, api, openApp));

  bot.on('message:contact', async (ctx) => {
    const { contact } = ctx.message;
    if (contact.user_id !== ctx.from.id) {
      await ctx.reply(t.staffInvite.notOwn, { reply_markup: shareKeyboard() });
      return;
    }

    await store.set(studentCodeKey(ctx.from.id), contact.phone_number, 'EX', STUDENT_CODE_TTL_S);
    if (await takeStudentIntent(store, ctx.from.id)) {
      // Oʻquvchi kirishi: ota-ona soʻrovi yaratilmaydi (T-126 bosqich 3)
      await ctx.reply(t.studentLogin.promptCode, { reply_markup: { remove_keyboard: true } });
      return;
    }

    const staffHandled = await handleStaffContact(ctx, api, contact, openApp);
    if (!staffHandled) {
      await handleGuardianContact({
        ctx,
        api,
        phone: contact.phone_number,
        openApp,
        createRequest: false,
      });
    }
  });

  // «Ota-ona sifatida soʻrov yuborish»: kontakt raqami Redis'da (10 daq) — shu bilan soʻrov
  bot.callbackQuery('guardian:request', async (ctx) => {
    await ctx.answerCallbackQuery();
    const phone = await store.get(studentCodeKey(ctx.from.id));
    if (!phone) {
      await ctx.reply(t.parentOnboarding.welcomeBody, { reply_markup: shareKeyboard() });
      return;
    }
    await handleGuardianContact({ ctx, api, phone, openApp, createRequest: true });
  });
}
