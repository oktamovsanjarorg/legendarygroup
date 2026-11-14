import { ROLES, type RoleCode } from '@lg/contracts';
import { supports, type WebApp } from '@lg/ui-tg';

const KEY = 'lg_role';

export interface RoleStore {
  get(): Promise<RoleCode | undefined>;
  set(role: RoleCode): Promise<void>;
  clear(): Promise<void>;
}

const isRole = (v: string | undefined): v is RoleCode =>
  v !== undefined && (ROLES as readonly string[]).includes(v);

/**
 * Tanlangan rol (C-02 "eslab qolinadi"): Telegram CloudStorage — foydalanuvchining barcha
 * qurilmalarida bir xil. 6.9 dan eski klientda — eslab qolinmaydi (har safar tanlanadi).
 * Bu faqat qulaylik: rol har safar server tomonida tekshiriladi.
 */
export function cloudRoleStore(wa: WebApp): RoleStore {
  const cs = supports(wa, 'cloudStorage') ? wa.CloudStorage : null;
  return {
    get: () =>
      new Promise((resolve) => {
        if (!cs) return resolve(undefined);
        cs.getItem(KEY, (err, value) => resolve(!err && isRole(value) ? value : undefined));
      }),
    set: (role) =>
      new Promise((resolve) => (cs ? cs.setItem(KEY, role, () => resolve()) : resolve())),
    clear: () => new Promise((resolve) => (cs ? cs.removeItem(KEY, () => resolve()) : resolve())),
  };
}
