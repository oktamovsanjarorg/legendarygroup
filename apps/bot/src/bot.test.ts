import { botMessages } from '@lg/i18n';
import type { Update } from 'grammy/types';
import { describe, expect, it } from 'vitest';
import { createBot } from './bot.js';
import type { InternalApi } from './internal-api.js';
import type { BotStore } from './dedupe.js';
import { createWebhookServer, registerWebhook, WEBHOOK_PATH } from './server.js';

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
export const memoryStore = (): BotStore => {
  const map = new Map<string, string>();
  return {
    set: async (k, v, ...opts) => {
      const isNx = opts.includes('NX');
      if (isNx && map.has(k)) return null;
      map.set(k, v);
      return 'OK';
    },
    get: async (k) => map.get(k) ?? null,
    del: async (k) => (map.delete(k) ? 1 : 0),
  };
};

/** Fake API: xodim Karimov Rustam +998932220002; +998932220009 — boshqa Telegram'da. */
function fakeApi(): InternalApi & { shared: unknown[] } {
  const shared: unknown[] = [];
  return {
    shared,
    shareContact: async (input) => {
      shared.push(input);
      if (input.phone.replace(/\D/g, '') === '998932220009') return { result: 'conflict' };
      return input.phone.replace(/\D/g, '') === '998932220002'
        ? { result: 'staff_linked', fullName: 'Karimov Rustam' }
        : { result: 'not_found' };
    },
    checkStatus: async (telegramId) => {
      if (telegramId === 42) {
        return {
          status: 'linked',
          role: 'guardian',
          fullName: 'Ali',
          students: [{ id: 's1', fullName: 'Farzand Ali' }],
        };
      }
      if (telegramId === 102) {
        return { status: 'pending_approval' };
      }
      return { status: 'not_registered' };
    },
    confirmTelegramLogin: async () => false,
    shareGuardianContact: async (input) => {
      if (input.phone.replace(/\D/g, '') === '998901112233') {
        return {
          result: 'guardian_linked',
          fullName: 'Valiyev Vali',
          students: [{ id: 's1', fullName: 'Valiyeva Laylo' }],
        };
      }
      shared.push(input);
      return input.createRequest === false
        ? { result: 'not_found' }
        : { result: 'request_created' };
    },
    linkStudent: async () => ({ result: 'invalid' }),
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
const command = (text: string, userId = 42): Update => ({
  update_id: ++updateId,
  message: {
    message_id: updateId,
    date: 1_794_000_000,
    chat: { id: userId, type: 'private', first_name: 'Ali' },
    from: { id: userId, is_bot: false, first_name: 'Ali' },
    text,
    entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0]!.length }],
  },
});

describe('Bot (T-010, T-110)', () => {
  it('/start bogʻlangan foydalanuvchi — salomlashuv va Mini App tugmasi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start', 42));
    expect(calls).toHaveLength(1);
    const { method, payload } = calls[0]!;
    expect(method).toBe('sendMessage');
    expect(payload['text']).toContain('Ali');
    expect(payload['text']).toContain('Farzand Ali');
    expect(JSON.stringify(payload['reply_markup'])).toContain(
      '"web_app":{"url":"https://app.example.uz/app"}',
    );
  });

  it('/start yangi foydalanuvchi — maxfiylik roziligi va raqam ulashish tugmasi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start', 99));
    expect(calls).toHaveLength(1);
    const { method, payload } = calls[0]!;
    expect(method).toBe('sendMessage');
    expect(payload['text']).toContain(botMessages.parentOnboarding.welcomeTitle);
    expect(JSON.stringify(payload['reply_markup'])).toContain('"request_contact":true');
  });

  it('/start soʻrovi kutilayotgan foydalanuvchi — kutilmoqda xabari', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start', 102));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toContain(botMessages.parentOnboarding.pendingTitle);
  });

  it("lokal http URL — web_app o'rniga oddiy havola (Telegram faqat HTTPS qabul qiladi)", async () => {
    const { bot, calls } = setup('http://localhost:5174');
    await bot.handleUpdate(command('/start', 42));
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

  it('erkin matn yuborilganda — yoʻnaltiruvchi salomlashuv va ilova tugmasi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate({
      update_id: ++updateId,
      message: {
        message_id: updateId,
        date: 1_794_000_000,
        chat: { id: 42, type: 'private', first_name: 'Ali' },
        from: { id: 42, is_bot: false, first_name: 'Ali' },
        text: 'Salom, dars qachon?',
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toContain(botMessages.unknownMessage.title);
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('web_app');
  });

  it('chek rasmi yoki hujjat yuborilganda — chek yuborish boʻyicha yoʻriqnoma', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate({
      update_id: ++updateId,
      message: {
        message_id: updateId,
        date: 1_794_000_000,
        chat: { id: 42, type: 'private', first_name: 'Ali' },
        from: { id: 42, is_bot: false, first_name: 'Ali' },
        photo: [{ file_id: 'ph1', file_unique_id: 'u1', width: 100, height: 100 }],
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toContain(botMessages.receiptUploadHelp.title);
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('web_app');
  });
});

let cbId = 0;
const callback = (data: string, userId = 42): Update => ({
  update_id: 50_000 + (cbId += 1),
  callback_query: {
    id: `cb${cbId}`,
    from: { id: userId, is_bot: false, first_name: 'Ali' },
    chat_instance: 'i',
    message: {
      message_id: 900 + cbId,
      date: 1_794_000_000,
      chat: { id: userId, type: 'private', first_name: 'Ali' },
      text: 'prompt',
    },
    data,
  },
});

const contact = (phone: string, contactUserId = 42): Update => ({
  update_id: ++updateId,
  message: {
    message_id: updateId,
    date: 1_794_000_000,
    chat: { id: 42, type: 'private', first_name: 'Rustam' },
    from: { id: 42, is_bot: false, first_name: 'Rustam', username: 'rustam_k' },
    contact: { phone_number: phone, first_name: 'Rustam', user_id: contactUserId },
  },
});

describe('Ustozni ulash (T-101) va Ota-ona onboarding (T-110)', () => {
  it('Q-98: eski /start inv_<token> havolasi ham oddiy /start kabi — raqam tugmasi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start inv_old', 99));
    expect(calls[0]?.payload['text']).toContain(botMessages.parentOnboarding.welcomeTitle);
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('"request_contact":true');
  });

  it('Q-98: ota-ona soʻrovi kutilayotgan odam ham raqamini qayta ulasha oladi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start', 102));
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('"request_contact":true');
  });

  it('Q-98: raqam boshqa Telegramga ulangan — aniq xabar, ota-ona oqimiga oʻtmaydi', async () => {
    const { bot, calls, api } = setup();
    await bot.handleUpdate(contact('998932220009'));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toBe(botMessages.staffInvite.conflict);
    expect(api.shared).toHaveLength(1);
  });

  it("o'z kontakti xodimniki — taklifsiz ulandi (klaviatura olinadi, ilova tugmasi)", async () => {
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

  it('ota-ona raqami bazada mavjud — bogʻlanadi va farzandlar koʻrsatiladi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contact('+998901112233'));
    expect(calls).toHaveLength(2);
    expect(calls[0]?.payload['text']).toContain('Valiyev Vali');
    expect(calls[0]?.payload['text']).toContain('Valiyeva Laylo');
    expect(JSON.stringify(calls[1]?.payload['reply_markup'])).toContain('web_app');
  });

  it('nomaʼlum raqam — soʻrov darhol yaratilmaydi, «ota-ona / oʻquvchi» tanlovi (T-126)', async () => {
    const api = fakeApi();
    const { bot, calls } = setup(undefined, api);
    await bot.handleUpdate(contact('+998990001122'));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toContain(botMessages.parentOnboarding.unknownPhoneTitle);
    const markup = JSON.stringify(calls[0]?.payload['reply_markup']);
    expect(markup).toContain('guardian:request');
    expect(markup).toContain('student:enter_code');
    expect(api.shared.at(-1)).toMatchObject({ createRequest: false });

    await bot.handleUpdate(callback('guardian:request'));
    expect(api.shared.at(-1)).toMatchObject({ phone: '+998990001122', createRequest: true });
    expect(calls.at(-1)?.payload['text']).toContain(
      botMessages.parentOnboarding.requestCreatedTitle,
    );
  });

  it('farzandi roʻyxatsiz ota-ona — matn i18n dan', async () => {
    const api = fakeApi();
    api.shareGuardianContact = async () => ({
      result: 'guardian_linked',
      fullName: 'Vali',
      students: [],
    });
    const { bot, calls } = setup(undefined, api);
    await bot.handleUpdate(contact('+998901112233'));
    expect(calls[0]?.payload['text']).toContain(botMessages.parentOnboarding.childrenFallback);
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

describe('Webhook roʻyxatdan oʻtkazish (setWebhook)', () => {
  it('HTTPS — setWebhook secret_token bilan; http — chaqirilmaydi', async () => {
    const { bot, calls } = setup();
    const url = 'https://lg.example.uz/bot/webhook';
    expect(await registerWebhook(bot, url, 'webhook_secret_123456')).toBe(true);
    expect(calls).toEqual([
      {
        method: 'setWebhook',
        payload: { url, secret_token: 'webhook_secret_123456', drop_pending_updates: false },
      },
    ]);
    expect(await registerWebhook(bot, 'http://localhost/bot/webhook', 'x')).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
