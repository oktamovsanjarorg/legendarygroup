import type { RoleCode } from '@lg/contracts';

/**
 * `startapp` deep link'lari (docs/ux/screens.md §5, 11-ux §4.9).
 * Format: `<prefiks>_<id>` yoki aniq kalit (`pay_q`); ≤ 64 belgi, `[A-Za-z0-9_-]`.
 */
export interface DeepLink {
  screen: string;
  /** Qaysi rol(lar) uchun — boshqa rolda ochilsa, foydalanuvchida bo'lsa shu rolga o'tiladi. */
  roles: readonly RoleCode[];
  id?: string;
}

interface Rule {
  key: string;
  screen: string;
  roles: readonly RoleCode[];
  /** `true` — aniq kalit (id'siz), aks holda prefiks. */
  exact?: boolean;
}

const STAFF: readonly RoleCode[] = ['admin', 'director'];

/** Tartib muhim: aniq kalitlar prefikslardan oldin (`pay_q` ≠ `pay_<id>`). */
export const DEEP_LINK_RULES: readonly Rule[] = [
  { key: 'pay_q', screen: 'MS-02', roles: STAFF, exact: true },
  { key: 'att', screen: 'MT-02', roles: ['teacher'] },
  { key: 'imp', screen: 'MT-08', roles: ['teacher'] },
  { key: 'les', screen: 'MG-01', roles: ['guardian'] },
  { key: 'res', screen: 'MG-02', roles: ['guardian'] },
  { key: 'tst', screen: 'MG-03', roles: ['guardian'] },
  { key: 'rep', screen: 'MG-04', roles: ['guardian'] },
  { key: 'bil', screen: 'MG-05', roles: ['guardian'] },
  { key: 'pay', screen: 'MG-06', roles: ['guardian'] },
  { key: 'sub', screen: 'MG-07', roles: ['guardian'] },
  { key: 'tik', screen: 'MG-09', roles: ['guardian'] },
  { key: 'apr', screen: 'MS-03', roles: ['director'] },
  { key: 'stu', screen: 'MS-05', roles: STAFF },
];

const PARAM = /^[A-Za-z0-9_-]{1,64}$/;
const ID = /^[A-Za-z0-9-]+$/;

/** Noto'g'ri yoki noma'lum parametr — `null` (bosh sahifa ochiladi). */
export function parseStartParam(
  param: string | undefined,
  rules: readonly Rule[] = DEEP_LINK_RULES,
): DeepLink | null {
  if (!param || !PARAM.test(param)) return null;
  for (const r of rules) {
    if (r.exact) {
      if (param === r.key) return { screen: r.screen, roles: r.roles };
      continue;
    }
    const prefix = `${r.key}_`;
    if (!param.startsWith(prefix)) continue;
    const id = param.slice(prefix.length);
    return ID.test(id) ? { screen: r.screen, roles: r.roles, id } : null;
  }
  return null;
}

/**
 * Ekran → yo'l. Har ekran vazifasi (T-111 MT-02, T-116 MG-01 ...) shu yerga qo'shadi;
 * hali qurilmagan ekranga link — bosh sahifa (bo'sh "tez orada" sahifa yo'q).
 */
export const SCREEN_PATHS: Readonly<Record<string, (id?: string) => string>> = {};

export function deepLinkPath(
  link: DeepLink,
  paths: Readonly<Record<string, (id?: string) => string>> = SCREEN_PATHS,
): string | null {
  return paths[link.screen]?.(link.id) ?? null;
}

/** Link boshqa rol uchun bo'lsa — foydalanuvchining mos roli; mos kelmasa yoki shart emas — `null`. */
export function roleForLink(
  link: DeepLink | null,
  userRoles: readonly RoleCode[],
  active: RoleCode | undefined,
): RoleCode | null {
  if (!link || (active && link.roles.includes(active))) return null;
  return link.roles.find((r) => userRoles.includes(r)) ?? null;
}
