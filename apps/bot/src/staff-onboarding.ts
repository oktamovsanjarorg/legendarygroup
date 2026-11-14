import { botMessages as t } from '@lg/i18n';
import { type Bot, type Context, type InlineKeyboard, Keyboard } from 'grammy';
import type { InternalApi } from './internal-api.js';

/** `/start inv_<token>` (T-101: API'dagi `BOT_INVITE_PREFIX` bilan bir xil). */
export const INVITE_PREFIX = 'inv_';

const shareKeyboard = () =>
  new Keyboard().requestContact(t.parentOnboarding.shareButton).resized().oneTime();

const escapeHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

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

async function onNormalStart(
  ctx: Context,
  api: InternalApi,
  openApp: () => InlineKeyboard,
): Promise<void> {
  if (!ctx.from) return;
  const status = await api.checkStatus(ctx.from.id);

  if (status.status === 'linked') {
    if (status.role === 'guardian') {
      const children =
        (status.students ?? []).map((s) => `• ${escapeHtml(s.fullName)}`).join('\n') ||
        "Ro'yxatga olingan farzandlar mavjud";
      const text = t.parentOnboarding.alreadyLinked
        .replace('{name}', escapeHtml(status.fullName ?? ''))
        .replace('{children}', children);
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: openApp() });
      return;
    }
    const text = t.parentOnboarding.staffGreeting.replace(
      '{name}',
      escapeHtml(status.fullName ?? ''),
    );
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: openApp() });
    return;
  }

  if (status.status === 'pending_approval') {
    await ctx.reply(
      `<b>${t.parentOnboarding.pendingTitle}</b>\n${t.parentOnboarding.pendingBody}`,
      { parse_mode: 'HTML' },
    );
    return;
  }

  if (status.status === 'rejected') {
    await ctx.reply(
      t.parentOnboarding.rejectedBody.replace('{reason}', escapeHtml(status.rejectReason ?? '')),
    );
    return;
  }

  await ctx.reply(
    `<b>${t.parentOnboarding.welcomeTitle}</b>\n\n${t.parentOnboarding.welcomeBody}`,
    {
      parse_mode: 'HTML',
      reply_markup: shareKeyboard(),
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

async function handleGuardianContact(
  ctx: Context,
  api: InternalApi,
  contact: { phone_number: string },
  openApp: () => InlineKeyboard,
): Promise<void> {
  if (!ctx.from) return;
  const fullName =
    [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
  const guardianRes = await api.shareGuardianContact({
    telegramId: ctx.from.id,
    phone: contact.phone_number,
    fullName,
    username: ctx.from.username,
  });

  if (guardianRes.result === 'guardian_linked' || guardianRes.result === 'already_linked') {
    const children =
      (guardianRes.students ?? []).map((s) => `• ${escapeHtml(s.fullName)}`).join('\n') ||
      "Ro'yxatga olingan farzandlar mavjud";
    const title =
      guardianRes.result === 'guardian_linked'
        ? t.parentOnboarding.linkedTitle.replace('{name}', escapeHtml(guardianRes.fullName ?? ''))
        : t.parentOnboarding.alreadyLinked
            .replace('{name}', escapeHtml(guardianRes.fullName ?? ''))
            .replace('{children}', children);
    const body =
      guardianRes.result === 'guardian_linked'
        ? t.parentOnboarding.linkedChildren.replace('{children}', children)
        : '';

    await ctx.reply(`<b>${title}</b>${body ? `\n\n${body}` : ''}`, {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
    await ctx.reply(t.openApp, { reply_markup: openApp() });
    return;
  }

  await ctx.reply(
    `<b>${t.parentOnboarding.requestCreatedTitle}</b>\n\n${t.parentOnboarding.requestCreatedBody.replace('{phone}', contact.phone_number)}`,
    { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } },
  );
}

/**
 * Onboarding (T-101 xodim, T-110 ota-ona).
 */
export function registerStaffOnboarding(
  bot: Bot,
  api: InternalApi,
  openApp: () => InlineKeyboard,
): void {
  bot.command('start', async (ctx) => {
    const param = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    if (param.startsWith(INVITE_PREFIX)) {
      await onInvite(ctx, api, param.slice(INVITE_PREFIX.length));
      return;
    }
    await onNormalStart(ctx, api, openApp);
  });

  bot.on('message:contact', async (ctx) => {
    const { contact } = ctx.message;
    if (contact.user_id !== ctx.from.id) {
      await ctx.reply(t.staffInvite.notOwn, { reply_markup: shareKeyboard() });
      return;
    }

    const staffHandled = await handleStaffContact(ctx, api, contact, openApp);
    if (!staffHandled) {
      await handleGuardianContact(ctx, api, contact, openApp);
    }
  });
}
