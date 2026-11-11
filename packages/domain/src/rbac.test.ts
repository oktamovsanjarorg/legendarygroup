import {
  DELEGABLE_PERMISSIONS,
  NON_DELEGABLE_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
} from '@lg/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canRemoveDirector, effectivePermissions, overrideError } from './rbac.js';

const anyOverride = fc.record({
  permission: fc.constantFrom(...PERMISSIONS),
  granted: fc.boolean(),
});

describe('effectivePermissions (02 §1, §4)', () => {
  it("override'siz — rol matritsasi", () => {
    for (const role of ROLES)
      expect([...effectivePermissions(role)].sort()).toEqual([...ROLE_PERMISSIONS[role]].sort());
  });

  it("Admin'ga delegatsiya qilinadigan ruxsat beriladi, olib qo'yiladi", () => {
    expect(
      effectivePermissions('admin', [{ permission: 'finance.view', granted: true }]).has(
        'finance.view',
      ),
    ).toBe(true);
    expect(
      effectivePermissions('admin', [{ permission: 'cash.close', granted: false }]).has(
        'cash.close',
      ),
    ).toBe(false);
  });

  it("property: hech qanday override delegatsiya qilinmaydigan ruxsatni Admin'ga bermaydi", () => {
    fc.assert(
      fc.property(fc.array(anyOverride, { maxLength: 40 }), (overrides) => {
        const perms = effectivePermissions('admin', overrides);
        return NON_DELEGABLE_PERMISSIONS.every((p) => !perms.has(p));
      }),
    );
  });

  it("property: override faqat ruxsat qo'shadi — ustoz/ota-ona/director'ga hech narsa qo'shilmaydi", () => {
    fc.assert(
      fc.property(
        fc.constantFrom('director', 'teacher', 'guardian' as const),
        fc.array(anyOverride),
        (role, overrides) => {
          const base = new Set(ROLE_PERMISSIONS[role]);
          return [...effectivePermissions(role, overrides)].every((p) => base.has(p));
        },
      ),
    );
  });
});

describe('overrideError', () => {
  it('delegatsiya qilinmaydigan → NON_DELEGABLE_PERMISSION', () => {
    for (const p of NON_DELEGABLE_PERMISSIONS) {
      expect(overrideError('admin', { permission: p, granted: true })).toBe(
        'NON_DELEGABLE_PERMISSION',
      );
    }
  });

  it("faqat Admin'ga va faqat DELEGABLE beriladi; cheklash — faqat rolda bor ruxsatga", () => {
    for (const p of DELEGABLE_PERMISSIONS) {
      expect(overrideError('admin', { permission: p, granted: true })).toBeNull();
      expect(overrideError('teacher', { permission: p, granted: true })).toBe(
        'OVERRIDE_NOT_ALLOWED',
      );
    }
    expect(overrideError('teacher', { permission: 'attendance.mark', granted: false })).toBeNull();
    expect(overrideError('teacher', { permission: 'audit.view', granted: false })).toBe(
      'OVERRIDE_NOT_ALLOWED',
    );
  });
});

describe('Oxirgi Director himoyasi (02 §2, Q-61)', () => {
  it("boshqa faol Director bo'lmasa — olib bo'lmaydi", () => {
    expect(canRemoveDirector(0)).toBe(false);
    expect(canRemoveDirector(1)).toBe(true);
  });
});
