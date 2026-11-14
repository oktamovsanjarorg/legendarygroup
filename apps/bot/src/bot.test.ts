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
    shareGuardianContact: async (input) => {
      if (input.phone.replace(/\D/g, '') === '998901112233') {
        return {
          result: 'guardian_linked',
          fullName: 'Valiyev Vali',
          students: [{ id: 's1', fullName: 'Valiyeva Laylo' }],
        };
      }
      return { result: 'request_created' };
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
  it('/start inv_<token> — ism (HTML escape) va "telefon ulashish" tugmasi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start inv_good-token'));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toContain('Karimov &lt;Rustam&gt;');
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('"request_contact":true');
  });

  it('eskirgan taklif — tushunarli xabar', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(command('/start inv_old'));
    expect(calls[0]?.payload['text']).toBe(botMessages.staffInvite.invalid);
  });

  it("o'z kontakti xodim taklifi bilan — ulandi (klaviatura olinadi, ilova tugmasi)", async () => {
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

  it('nomaʼlum raqam — adminga soʻrov yuborildi xabari', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contact('+998990001122'));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload['text']).toContain(botMessages.parentOnboarding.requestCreatedTitle);
    expect(JSON.stringify(calls[0]?.payload['reply_markup'])).toContain('"remove_keyboard":true');
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
