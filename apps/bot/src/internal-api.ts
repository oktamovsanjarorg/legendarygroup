import {
  BotGuardianContactResult,
  type BotGuardianContactResult as GuardianContactResult,
  BotStudentLinkResult,
  BotTelegramStatusResult,
  type BotTelegramStatusResult as StatusResult,
  TelegramLoginConfirmResult,
  TelegramContactResult,
  type TelegramContactResult as ContactResult,
} from '@lg/contracts';
import type { z } from 'zod';
import type { BotEnv } from './env.js';

/** Bot → API ichki chaqiruvlari (bot DB'ga tegmaydi — 03 §2). Testda — fake. */
export interface InternalApi {
  shareContact(input: {
    telegramId: number;
    phone: string;
    username?: string;
  }): Promise<ContactResult>;
  checkStatus(telegramId: number): Promise<StatusResult>;
  /** `createRequest: false` — raqam topilmasa soʻrov yaratilmaydi (`not_found`). */
  shareGuardianContact(input: {
    telegramId: number;
    phone: string;
    fullName: string;
    username?: string;
    createRequest?: boolean;
  }): Promise<GuardianContactResult>;
  /** Oʻquvchini shaxsiy kod orqali bogʻlash (T-126). */
  linkStudent(input: {
    telegramId: number;
    phone: string;
    code: string;
  }): Promise<BotStudentLinkResult>;
  /** "Telegram orqali kirish" tasdig'i — tugmani bosgan akkaunt xodimniki bo'lsa `true`. */
  confirmTelegramLogin(challengeId: string, telegramId: number): Promise<boolean>;
}

type Fetch = typeof fetch;

export function createInternalApi(
  env: Pick<BotEnv, 'API_INTERNAL_URL' | 'INTERNAL_API_TOKEN'>,
  fetchFn: Fetch = (...a) => fetch(...a),
): InternalApi {
  const post = async <S extends z.ZodType>(
    path: string,
    body: unknown,
    schema: S,
  ): Promise<z.output<S>> => {
    const res = await fetchFn(`${env.API_INTERNAL_URL.replace(/\/$/, '')}/internal/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': env.INTERNAL_API_TOKEN },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`internal API ${path}: ${res.status}`);
    return schema.parse(await res.json());
  };
  return {
    shareContact: (input) =>
      post(
        'staff/contact',
        { ...input, telegramId: String(input.telegramId) },
        TelegramContactResult,
      ),
    checkStatus: (telegramId) =>
      post('guardian/status', { telegramId: String(telegramId) }, BotTelegramStatusResult),
    shareGuardianContact: (input) =>
      post(
        'guardian/contact',
        { ...input, telegramId: String(input.telegramId) },
        BotGuardianContactResult,
      ),
    linkStudent: (input) =>
      post(
        'student/link',
        { ...input, telegramId: String(input.telegramId) },
        BotStudentLinkResult,
      ),
    confirmTelegramLogin: async (challengeId, telegramId) =>
      (
        await post(
          'auth/telegram/confirm',
          { challengeId, telegramId: String(telegramId) },
          TelegramLoginConfirmResult,
        )
      ).confirmed,
  };
}
