import type { RoleCode, TelegramAuthResult } from '@lg/contracts';
import { ApiClient } from '@lg/ui-core';

/**
 * Mini App klienti: refresh cookie yo'q (T-007 — sessiyasiz, 15 daq access token).
 * Token eskirsa — `initData` faol rol bilan qayta almashtiriladi (single-flight `ApiClient`'da).
 */
export function createApi(initData: string, activeRole: () => RoleCode | undefined): ApiClient {
  return new ApiClient(async (send) => {
    const res = await send('/auth/telegram', {
      method: 'POST',
      body: { initData, role: activeRole() },
    });
    if (!res.ok) return null;
    const r = (await res.json()) as TelegramAuthResult;
    return r.next === 'done' ? r.accessToken : null;
  });
}
