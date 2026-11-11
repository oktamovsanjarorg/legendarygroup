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
 * docs/02-roles-permissions.md §4 matritsasi. Hujjat o'zgarsa — shu jadval ham
 * o'zgaradi, aks holda CI yiqiladi. 1 = rolda bor, 0 = yo'q.
 * Ustunlar: director, admin, teacher, guardian.
 */
const MATRIX: Record<Permission, readonly [0 | 1, 0 | 1, 0 | 1, 0 | 1]> = {
  'staff.manage': [1, 0, 0, 0],
  'staff.permissions': [1, 0, 0, 0],
  'settings.manage': [1, 0, 0, 0],
  'audit.view': [1, 0, 0, 0],
  'course.manage': [1, 1, 0, 0],
  'group.manage': [1, 1, 0, 0],
  'group.view': [1, 1, 1, 0],
  'lesson.manage': [1, 1, 0, 0],
  'student.manage': [1, 1, 0, 0],
  'student.view': [1, 1, 1, 1],
  'lead.manage': [1, 1, 0, 0],
  'attendance.mark': [1, 1, 1, 0],
  'attendance.edit_past': [1, 1, 0, 0],
  'absence.notify': [1, 1, 0, 1],
  'grade.write': [1, 1, 1, 0],
  'test.manage': [1, 1, 1, 0],
  'results.view': [1, 1, 1, 1],
  'payment.create': [1, 1, 0, 0],
  'payment.submit': [0, 0, 0, 1],
  'payment.review': [1, 1, 0, 0],
  'payment.reverse': [1, 1, 0, 0],
  'payment.refund': [1, 0, 0, 0],
  'discount.grant': [1, 1, 0, 0],
  'penalty.waive': [1, 1, 0, 0],
  'billing.view': [1, 1, 0, 1],
  'cash.close': [1, 1, 0, 0],
  'expense.manage': [1, 0, 0, 0],
  'finance.view': [1, 0, 0, 0],
  'payroll.manage': [1, 0, 0, 0],
  'payroll.view_own': [0, 0, 1, 0],
  'announcement.send': [1, 1, 1, 0],
  'ticket.handle': [1, 1, 0, 0],
  'ticket.create': [0, 0, 0, 1],
  'stats.operational': [1, 1, 1, 1],
  'approval.decide': [1, 0, 0, 0],
};

describe('ROLE_PERMISSIONS (02-roles-permissions.md §4)', () => {
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
