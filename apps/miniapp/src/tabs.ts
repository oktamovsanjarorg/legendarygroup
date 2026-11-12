import type { RoleCode } from '@lg/contracts';
import type { TabItem } from '@lg/ui-tg';

/**
 * Pastki menyu rolga qarab (11-ux §2: Ustoz — Bugun/Guruhlarim/Jadval/Profil; Ota-ona —
 * Asosiy/Natijalar/To'lovlar/Ko'proq; xodim — Bugun/Navbat/So'rovlar/Qidiruv).
 * Faqat **qurilgan** ekranlar: har ekran vazifasi (T-114, T-116, T-120 ...) o'z tabini qo'shadi.
 * Tab 2 tadan kam bo'lsa — menyu ko'rsatilmaydi.
 */
export const TABS: Readonly<Record<RoleCode, readonly TabItem[]>> = {
  director: [],
  admin: [],
  teacher: [],
  guardian: [],
};

export const tabsFor = (
  role: RoleCode,
  table: Readonly<Record<RoleCode, readonly TabItem[]>> = TABS,
): readonly TabItem[] => (table[role].length >= 2 ? table[role] : []);
