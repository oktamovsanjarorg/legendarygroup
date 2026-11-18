import { botMessages } from '@lg/i18n';
import type { Update } from 'grammy/types';
import { describe, expect, it } from 'vitest';
import { createBot } from './bot.js';
import type { BotStore } from './dedupe.js';
import type { InternalApi } from './internal-api.js';

const TOKEN = '123456789:TEST_student_login_bot_token';
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

const memoryStore = (): BotStore => {
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

function fakeApi(): InternalApi {
  return {
    checkStaffInvite: async () => ({ valid: false }),
    shareContact: async () => ({ result: 'not_found' }),
    checkStatus: async (telegramId) => {
      if (telegramId === 55) {
        return {
          status: 'linked',
          role: 'student',
          fullName: 'Jasur Bek',
        };
      }
      return { status: 'not_registered' };
    },
    shareGuardianContact: async (input) =>
      input.createRequest === false ? { result: 'not_found' } : { result: 'request_created' },
    confirmTelegramLogin: async () => false,
    linkStudent: async (input) => {
      if (input.code === '123456' && input.phone === '+998901112233') {
        return { result: 'linked', fullName: 'Anvar Aliyev' };
      }
      if (input.code === '999999') {
        return { result: 'rate_limited' };
      }
      if (input.code === '888888') {
        return { result: 'already_linked' };
      }
      return { result: 'invalid' };
    },
  };
}

let updateId = 2000;

const contactUpdate = (phone: string, userId = 42): Update => ({
  update_id: ++updateId,
  message: {
    message_id: updateId,
    date: 1_794_000_000,
    chat: { id: userId, type: 'private', first_name: 'Ali' },
    from: { id: userId, is_bot: false, first_name: 'Ali' },
    contact: { phone_number: phone, first_name: 'Ali', user_id: userId },
  },
});

const textUpdate = (text: string, userId = 42): Update => ({
  update_id: ++updateId,
  message: {
    message_id: updateId,
    date: 1_794_000_000,
    chat: { id: userId, type: 'private', first_name: 'Ali' },
    from: { id: userId, is_bot: false, first_name: 'Ali' },
    text,
  },
});

const callbackUpdate = (data: string, userId = 42): Update => ({
  update_id: ++updateId,
  callback_query: {
    id: `cb_${++updateId}`,
    from: { id: userId, is_bot: false, first_name: 'Ali' },
    chat_instance: 'inst_1',
    message: {
      message_id: ++updateId,
      date: 1_794_000_000,
      chat: { id: userId, type: 'private', first_name: 'Ali' },
      text: 'prompt',
    },
    data,
  },
});

const commandUpdate = (text: string, userId = 42): Update => ({
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

function setup(api = fakeApi(), store = memoryStore()) {
  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  const bot = createBot({
    env: { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_MINIAPP_URL: 'https://app.example.uz' },
    store,
    log: { error: () => undefined },
    botInfo,
    api,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as never;
  });
  return { bot, calls, store };
}

describe('Oʻquvchi shaxsiy kod orqali kirish (T-126)', () => {
  it('1. Kontakt ulashilganda Men oʻquvchiman tugmasi chiqadi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contactUpdate('+998901112233', 42));

    const reply = calls.find((c) => c.method === 'sendMessage');
    expect(reply).toBeDefined();
    const markup = JSON.stringify(reply?.payload['reply_markup']);
    expect(markup).toContain('student:enter_code');
  });

  it('2. Toʻgʻri 6 xonali kod → tabrik xabari va Mini App tugmasi', async () => {
    const { bot, calls, store } = setup();
    await bot.handleUpdate(contactUpdate('+998901112233', 42));
    calls.length = 0;

    await bot.handleUpdate(textUpdate('123456', 42));
    expect(calls.some((c) => String(c.payload['text']).includes('Anvar Aliyev'))).toBe(true);

    const remainingPhone = await store.get('student:awaiting_code:42');
    expect(remainingPhone).toBeNull();
  });

  it('3. Notoʻgʻri kod → xato xabari', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contactUpdate('+998901112233', 42));
    calls.length = 0;

    await bot.handleUpdate(textUpdate('000000', 42));
    expect(
      calls.some((c) => String(c.payload['text']).includes(botMessages.studentLogin.invalidCode)),
    ).toBe(true);
  });

  it('4. 15 daqiqalik cheklov (rate_limited) → kutish xabari', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contactUpdate('+998901112233', 42));
    calls.length = 0;

    await bot.handleUpdate(textUpdate('999999', 42));
    expect(
      calls.some((c) => String(c.payload['text']).includes(botMessages.studentLogin.rateLimited)),
    ).toBe(true);
  });

  it('5. Kod kiritmasdan boshqa matn yuborilsa → unknownMessage ga oʻtadi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contactUpdate('+998901112233', 42));
    calls.length = 0;

    await bot.handleUpdate(textUpdate('salom', 42));
    expect(
      calls.some((c) => String(c.payload['text']).includes(botMessages.unknownMessage.title)),
    ).toBe(true);
  });

  it('6. Kontakt ulashmasdan 6 xonali kod yozsa → kontakt soʻraydi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(textUpdate('123456', 99));

    expect(
      calls.some((c) => String(c.payload['text']).includes(botMessages.studentLogin.needContact)),
    ).toBe(true);
  });

  it('7. Men oʻquvchiman tugmasi bosilganda kod kiritish taklifi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(contactUpdate('+998901112233', 42));
    calls.length = 0;

    await bot.handleUpdate(callbackUpdate('student:enter_code', 42));
    expect(
      calls.some((c) => String(c.payload['text']).includes(botMessages.studentLogin.promptCode)),
    ).toBe(true);
  });

  it('8. Allaqachon ulangan oʻquvchi /start berganda oʻquvchi salomlashuvi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(commandUpdate('/start', 55));

    expect(calls.some((c) => String(c.payload['text']).includes('Jasur Bek'))).toBe(true);
  });

  it('9. /start → «Men oʻquvchiman» → kontakt: adminga ota-ona soʻrovi ketmaydi, kod soʻraladi', async () => {
    const api = fakeApi();
    let guardianRequests = 0;
    api.shareGuardianContact = async () => {
      guardianRequests += 1;
      return { result: 'request_created' };
    };
    const { bot, calls } = setup(api);
    await bot.handleUpdate(commandUpdate('/start', 42));
    expect(JSON.stringify(calls.at(-1)?.payload['reply_markup'])).toContain(
      botMessages.studentLogin.enterCodeButton,
    );

    await bot.handleUpdate(textUpdate(botMessages.studentLogin.enterCodeButton, 42));
    await bot.handleUpdate(contactUpdate('+998901112233', 42));
    expect(guardianRequests).toBe(0);
    expect(String(calls.at(-1)?.payload['text'])).toBe(botMessages.studentLogin.promptCode);

    await bot.handleUpdate(textUpdate('123456', 42));
    expect(String(calls.at(-1)?.payload['text'])).toContain('Anvar Aliyev');
  });
});
