import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS, type Permission } from './permissions.js';
import {
  DELEGABLE_PERMISSIONS,
  NON_DELEGABLE_PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  type RoleCode,
} from './roles.js';

/**
 * Hujjat = kod (T-008 AC): docs/02-roles-permissions.md §4 jadvali to'g'ridan-to'g'ri o'qiladi.
 * Katakda ✅ / 🔸 (scope) / 🟡 (policy) bo'lsa — rolda bor; ❌ / — / D / faqat ⬆️ — yo'q.
 * Hujjat yoki `ROLE_PERMISSIONS` yolg'iz o'zgarsa — CI yiqiladi.
 */
const DOC = readFileSync(
  fileURLToPath(new URL('../../../docs/02-roles-permissions.md', import.meta.url)),
  'utf8',
);
const MATRIX = Object.fromEntries(
  DOC.split('\n')
    .filter((l) => /^\|\s*`[a-z_]+\.[a-z_]+`/.test(l))
    .map((l) => {
      const cells = l.split('|').map((c) => c.trim());
      const code = cells[1]?.replaceAll('`', '') as Permission;
      const has = cells.slice(3, 7).map((c) => (/[✅🔸🟡]/u.test(c) ? 1 : 0));
      return [code, has];
    }),
) as Record<Permission, [0 | 1, 0 | 1, 0 | 1, 0 | 1]>;

describe('ROLE_PERMISSIONS (02-roles-permissions.md §4)', () => {
  it("hujjat jadvalida katalogdagi barcha ruxsatlar bor, ortiqchasi yo'q", () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...PERMISSIONS].sort());
  });

  it.each(ROLES.map((role, i) => [role, i] as [RoleCode, number]))(
    '%s roli matritsaga aynan mos keladi',
    (role, col) => {
      const expected = PERMISSIONS.filter((p) => MATRIX[p][col] === 1);
      expect([...ROLE_PERMISSIONS[role]].sort()).toEqual([...expected].sort());
    },
  );

  it("har rol ichida takroriy ruxsat yo'q", () => {
    for (const role of ROLES) {
      expect(new Set(ROLE_PERMISSIONS[role]).size).toBe(ROLE_PERMISSIONS[role].length);
    }
  });

  it('Admin delegatsiya qilinmaydigan va delegatsiya qilinadigan ruxsatlarga standart ega emas', () => {
    const admin = new Set(ROLE_PERMISSIONS.admin);
    for (const p of [...NON_DELEGABLE_PERMISSIONS, ...DELEGABLE_PERMISSIONS]) {
      expect(admin.has(p)).toBe(false);
    }
  });

  it("delegatsiya ro'yxatlari kesishmaydi", () => {
    const non = new Set<Permission>(NON_DELEGABLE_PERMISSIONS);
    expect(DELEGABLE_PERMISSIONS.filter((p) => non.has(p))).toEqual([]);
  });
});
