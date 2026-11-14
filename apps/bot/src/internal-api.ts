import {
  BotGuardianContactResult,
  type BotGuardianContactResult as GuardianContactResult,
  BotTelegramStatusResult,
  type BotTelegramStatusResult as StatusResult,
  StaffInviteCheckResult,
  type StaffInviteCheckResult as CheckResult,
  TelegramContactResult,
  type TelegramContactResult as ContactResult,
} from '@lg/contracts';
import type { z } from 'zod';
import type { BotEnv } from './env.js';

/** Bot → API ichki chaqiruvlari (bot DB'ga tegmaydi — 03 §2). Testda — fake. */
export interface InternalApi {
  checkStaffInvite(token: string): Promise<CheckResult>;
  shareContact(input: {
    telegramId: number;
    phone: string;
    username?: string;
  }): Promise<ContactResult>;
  checkStatus(telegramId: number): Promise<StatusResult>;
  shareGuardianContact(input: {
    telegramId: number;
    phone: string;
    fullName: string;
    username?: string;
  }): Promise<GuardianContactResult>;
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
    checkStaffInvite: (token) => post('staff/invite/check', { token }, StaffInviteCheckResult),
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
  };
}
