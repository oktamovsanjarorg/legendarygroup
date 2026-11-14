import type { RoleCode, TelegramAuthResult } from '@lg/contracts';
import { ApiError } from '@lg/ui-core';
import { type DeepLink, roleForLink } from '../deep-link.js';
import type { RoleStore } from './role-store.js';

export type Exchange = (role: RoleCode | undefined) => Promise<TelegramAuthResult>;

/**
 * C-01 kirish oqimi (T-007 `POST /auth/telegram`):
 * 1. eslab qolingan rol bilan; u endi yo'q bo'lsa (`ROLE_NOT_ASSIGNED`) — unutiladi, rolsiz qayta;
 * 2. deep link boshqa rol uchun bo'lsa va foydalanuvchida u bor — o'sha rolga o'tiladi
 *    (bir nechta rolda ham — tanlov ekranisiz);
 * 3. muvaffaqiyatli rol eslab qolinadi.
 * `TELEGRAM_NOT_LINKED` va boshqa xatolar chaqiruvchiga (`ApiError`) qaytadi.
 */
export async function signIn(
  exchange: Exchange,
  store: RoleStore,
  link: DeepLink | null,
): Promise<TelegramAuthResult> {
  const remembered = await store.get();
  let r = await exchange(remembered).catch(async (e: unknown) => {
    if (!(remembered && e instanceof ApiError && e.code === 'ROLE_NOT_ASSIGNED')) throw e;
    await store.clear();
    return exchange(undefined);
  });
  const userRoles = r.next === 'done' ? r.user.roles : r.roles;
  const active = r.next === 'done' ? r.user.activeRole : undefined;
  const target = roleForLink(link, userRoles, active);
  if (target) r = await exchange(target);
  if (r.next === 'done') await store.set(r.user.activeRole);
  return r;
}
