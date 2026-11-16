import { describe, expect, it } from 'vitest';
import type { EventHandlers } from '../outbox/index.js';
import type { TelegramMessage, TelegramOutbox } from '../telegram/index.js';
import type { StaffUsers } from './staff-users.js';
import { TelegramLoginNotifier } from './telegram-login-notifier.js';

type Handler = (e: { payload: { challengeId: string; userId: string } }) => Promise<void>;

/** Ro'yxatdan o'tgan iste'molchi + navbatga tushgan xabarlar. */
function setup(users: Record<string, bigint | null>) {
  let handler: Handler | undefined;
  const sent: { m: TelegramMessage; key?: string }[] = [];
  const events = { on: (_t: string, _c: string, h: Handler) => (handler = h) };
  const outbox = {
    enqueue: async (m: TelegramMessage, o?: { dedupeKey?: string }) => {
      sent.push({ m, key: o?.dedupeKey });
      return 'j';
    },
  };
  const staff = {
    byId: async (id: string) => (id in users ? { telegramId: users[id] } : undefined),
  };
  new TelegramLoginNotifier(
    events as unknown as EventHandlers,
    outbox as unknown as TelegramOutbox,
    staff as unknown as StaffUsers,
  ).onModuleInit();
  return { fire: (userId: string) => handler!({ payload: { challengeId: 'c-1', userId } }), sent };
}

describe('StaffTelegramLoginRequested → bot tasdiq xabari', () => {
  it('xodimning Telegram ID’siga «Tasdiqlash» tugmasi (tgl:<challenge>), dedupe challenge bo‘yicha', async () => {
    const { fire, sent } = setup({ u1: 555n });
    await fire('u1');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.m.chatId).toBe('555');
    expect(sent[0]!.key).toBe('tg-login-c-1');
    expect(JSON.stringify(sent[0]!.m.payload['reply_markup'])).toContain(
      '"callback_data":"tgl:c-1"',
    );
  });

  it('Telegram ulanmagan yoki topilmagan — xabarsiz', async () => {
    const { fire, sent } = setup({ u2: null });
    await fire('u2');
    await fire('yoq');
    expect(sent).toEqual([]);
  });
});
