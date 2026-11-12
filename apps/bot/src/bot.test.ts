import { botMessages } from '@lg/i18n';
import type { Update } from 'grammy/types';
import { describe, expect, it } from 'vitest';
import { createBot } from './bot.js';
import type { InternalApi } from './internal-api.js';
import type { DedupeStore } from './dedupe.js';
import { createWebhookServer, WEBHOOK_PATH } from './server.js';

const TOKEN = '123456789:TEST_bot_token_for_tests_only_x';
const botInfo = {
  id: 1,
  is_bot: true as const,
  first_name: 'LG',
  username: 'lg_test_bot',
  can_join_groups: false,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
};

/** Xotiradagi Redis o'rnini bosuvchi (SET NX EX). */
const memoryStore = (): DedupeStore => {
  const keys = new Set<string>();
  return { set: async (k) => (keys.has(k) ? null : (keys.add(k), 'OK')) };
};

/** Fake API: Karimov Rustam uchun faol taklif `good-token`, raqam +998932220002. */
function fakeApi(): InternalApi & { shared: unknown[] } {
  const shared: unknown[] = [];
  return {
    shared,
    checkStaffInvite: async (token) =>
      token === 'good-token' ? { valid: true, fullName: 'Karimov <Rustam>' } : { valid: false },
    shareContact: async (input) => {
      shared.push(input);
      return input.phone.replace(/\D/g, '') === '998932220002'
        ? { result: 'staff_linked', fullName: 'Karimov Rustam' }
        : { result: 'not_found' };
    },
  };
}

function setup(miniAppUrl = 'https://app.example.uz/app', api = fakeApi()) {
  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  const errors: unknown[] = [];
  const bot = createBot({
    env: { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_MINIAPP_URL: miniAppUrl },
    store: memoryStore(),
    log: { error: (e) => errors.push(e) },
    botInfo,
    api,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as never;
  });
  return { bot, calls, errors, api };
}

let updateId = 1000;
const command = (text: string): Update => ({
  update_id: ++updateId,
  message: {
    message_id: updateId,
    date: 1_794_000_000,
    chat: { id: 42, type: 'private', first_name: 'Ali' },
    from: { id: 42, is_bot: false, first_name: 'Ali' },
    text,
    // Telegram kabi: entity faqat buyruqni qamraydi (`/start`), parametrni emas.
    entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0]!.length }],
  },
});

describe('Bot (T-010)', () => {
  it('/start — salomlashuv va Mini App tugmasi (HTTPS — web_app)', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start'));
    expect(calls).toHaveLength(1);
    const { method, payload } = calls[0]!;
    expect(method).toBe('sendMessage');
    expect(payload['text']).toContain(botMessages.start.title);
    expect(JSON.stringify(payload['reply_markup'])).toContain(
      '"web_app":{"url":"https://app.example.uz/app"}',
    );
  });

  it("lokal http URL — web_app o'rniga oddiy havola (Telegram faqat HTTPS qabul qiladi)", async () => {
    const { bot, calls } = setup('http://localhost:5174');
    await bot.handleUpdate(command('/start'));
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain(
      '"url":"http://localhost:5174"',
    );
  });

  it('/help', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/help'));
    expect(calls[0]?.payload['text']).toContain(botMessages.help.title);
  });

  it('takroriy update (bir xil update_id) — bir marta ishlanadi', async () => {
    const { bot, calls } = setup();
    const u = command('/help');
    await bot.handleUpdate(u);
    await bot.handleUpdate(u);
    expect(calls).toHaveLength(1);
  });
});

const contact = (phone: string, userId = 42): Update => ({
  update_id: ++updateId,
  message: {
    message_id: updateId,
    date: 1_794_000_000,
    chat: { id: 42, type: 'private', first_name: 'Rustam' },
    from: { id: 42, is_bot: false, first_name: 'Rustam', username: 'rustam_k' },
    contact: { phone_number: phone, first_name: 'Rustam', user_id: userId },
  },
});

describe('Ustozni ulash (T-101)', () => {
  it('/start inv_<token> — ism (HTML escape) va "telefon ulashish" tugmasi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start inv_good-token'));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toContain('Karimov &lt;Rustam&gt;');
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('"request_contact":true');
  });

  it('eskirgan taklif — tushunarli xabar; oddiy /start — salomlashuv (taklifsiz)', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start inv_old'));
    await bot.handleUpdate(command('/start'));
    expect(calls[0]?.payload['text']).toBe(botMessages.staffInvite.invalid);
    expect(calls[1]?.payload['text']).toContain(botMessages.start.title);
  });

  it("o'z kontakti — API'ga yuboriladi; ulandi → 2 xabar (klaviatura olinadi, ilova tugmasi)", async () => {
    const { bot, calls, api } = setup();
    await bot.handleUpdate(contact('998932220002'));
    expect(api.shared).toEqual([{ telegramId: 42, phone: '998932220002', username: 'rustam_k' }]);
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('"remove_keyboard":true');
    expect(JSON.stringify(calls[1]?.payload['reply_markup'])).toContain('web_app');
  });

  it("BOSHQA birovning kontakti — API'ga yuborilmaydi (raqam egasi tekshiruvi)", async () => {
    const { bot, calls, api } = setup();
    await bot.handleUpdate(contact('998932220002', 999));
    expect(api.shared).toEqual([]);
    expect(calls[0]?.payload['text']).toBe(botMessages.staffInvite.notOwn);
  });

  it('taklifsiz raqam — "topilmadi"', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contact('+998901112233'));
    expect(calls[0]?.payload['text']).toBe(botMessages.staffInvite.notFound);
  });
});

describe('Webhook (secret_token)', () => {
  it("to'g'ri secret — 200; secret'siz yoki noto'g'ri — 401", async () => {
    const { bot } = setup();
    await bot.init();
    const server = createWebhookServer(bot, 'webhook_secret_123456');
    const send = (secret?: string) =>
      server.inject({
        method: 'POST',
        url: WEBHOOK_PATH,
        payload: command('/help'),
        headers: secret ? { 'x-telegram-bot-api-secret-token': secret } : {},
      });
    expect((await send()).statusCode).toBe(401);
    expect((await send('wrong_secret_xxxxxxx')).statusCode).toBe(401);
    expect((await send('webhook_secret_123456')).statusCode).toBe(200);
    expect((await server.inject({ url: '/health/live' })).statusCode).toBe(200);
    await server.close();
  });
});
