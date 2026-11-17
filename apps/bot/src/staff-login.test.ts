import { botMessages as t } from '@lg/i18n';
import type { Update } from 'grammy/types';
import { describe, expect, it } from 'vitest';
import { createBot } from './bot.js';
import type { InternalApi } from './internal-api.js';

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

const CHALLENGE = '0199a1e4-b2b3-7c00-8000-000000000001';

/** Faqat 42-akkaunt shu challenge'ni tasdiqlay oladi (API qoidasi). */
function setup() {
  const confirms: [string, number][] = [];
  const api = {
    confirmTelegramLogin: async (challengeId: string, telegramId: number) => {
      confirms.push([challengeId, telegramId]);
      return challengeId === CHALLENGE && telegramId === 42;
    },
  } as Partial<InternalApi> as InternalApi;
  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  const bot = createBot({
    env: { TELEGRAM_BOT_TOKEN: '1:T', TELEGRAM_MINIAPP_URL: 'https://app.example.uz/app' },
    store: { set: async () => 'OK', get: async () => null, del: async () => 1 },
    log: { error: () => undefined },
    botInfo,
    api,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as never;
  });
  return { bot, calls, confirms };
}

let id = 5000;
const press = (data: string, userId: number): Update => ({
  update_id: ++id,
  callback_query: {
    id: `cb${id}`,
    chat_instance: 'ci',
    data,
    from: { id: userId, is_bot: false, first_name: 'X' },
    message: {
      message_id: 7,
      date: 1_794_000_000,
      chat: { id: userId, type: 'private', first_name: 'X' },
      text: 'prompt',
    },
  },
});

describe('Telegram orqali kirish tasdigʻi (ADR 0006 §6)', () => {
  it('xodimning oʻzi bosdi — API tasdiqlaydi, xabar tahrirlanadi (tugma yoʻqoladi)', async () => {
    const { bot, calls, confirms } = setup();
    await bot.handleUpdate(press(`tgl:${CHALLENGE}`, 42));
    expect(confirms).toEqual([[CHALLENGE, 42]]);
    expect(calls.map((c) => c.method)).toEqual(['answerCallbackQuery', 'editMessageText']);
    expect(calls[1]!.payload['text']).toBe(t.staffLogin.confirmed);
  });

  it('begona akkaunt yoki eskirgan soʻrov — rad javobi', async () => {
    const { bot, calls } = setup();
    await bot.handleUpdate(press(`tgl:${CHALLENGE}`, 77));
    expect(calls[0]!.payload['text']).toBe(t.staffLogin.expired);
  });

  it('notoʻgʻri formatdagi callback — API chaqirilmaydi', async () => {
    const { bot, confirms } = setup();
    await bot.handleUpdate(press('tgl:../../x', 42));
    expect(confirms).toEqual([]);
  });
});
