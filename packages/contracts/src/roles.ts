import { PERMISSIONS, type Permission } from './permissions.js';

/** Tizim rollari — docs/02-roles-permissions.md §2. */
export const ROLES = ['director', 'admin', 'teacher', 'guardian'] as const;
export type RoleCode = (typeof ROLES)[number];

/** Foydalanuvchi holatlari — docs/05-data-model.md (`users.status`). */
export const USER_STATUSES = ['active', 'blocked'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Hech qachon Admin'ga berilmaydigan ruxsatlar (02-roles-permissions.md §4).
 */
export const NON_DELEGABLE_PERMISSIONS = [
  'staff.manage',
  'staff.permissions',
  'settings.manage',
  'audit.view',
  'payroll.manage',
  'approval.decide',
  'payment.refund',
] as const satisfies readonly Permission[];

/**
 * Director Admin'ga `user_permission_overrides` orqali bera oladigan ruxsatlar
 * (matritsadagi "D" belgisi). Standart holatda Admin'da yo'q.
 */
export const DELEGABLE_PERMISSIONS = [
  'expense.manage',
  'finance.view',
] as const satisfies readonly Permission[];

/**
 * Ruxsatlar matritsasi (RBAC qatlami). ✅, 🔸 (scope) va 🟡 (policy) — rolda bor;
 * scope/policy service va domain qatlamida tekshiriladi.
 * ❌, — , D (delegatsiya) va faqat ⬆️ (so'rov orqali) — rolda yo'q.
 */
/** Director ⊇ Admin. Faqat shaxsiy (ota-ona/ustoz) amallar Director'da yo'q. */
const DIRECTOR_EXCLUDED: readonly Permission[] = [
  'payment.submit',
  'payroll.view_own',
  'ticket.create',
];

export const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly Permission[]>> = {
  director: PERMISSIONS.filter((p) => !DIRECTOR_EXCLUDED.includes(p)),
  admin: [
    'course.manage',
    'group.manage',
    'group.view',
    'lesson.manage',
    'student.manage',
    'student.view',
    'lead.manage',
    'attendance.mark',
    'attendance.edit_past',
    'absence.notify',
    'grade.write',
    'test.manage',
    'results.view',
    'payment.create',
    'payment.review',
    'payment.reverse',
    'discount.grant',
    'penalty.waive',
    'billing.view',
    'cash.close',
    'announcement.send',
    'ticket.handle',
    'stats.operational',
  ],
  teacher: [
    'group.view',
    'student.view',
    'attendance.mark',
    'grade.write',
    'test.manage',
    'results.view',
    'payroll.view_own',
    'announcement.send',
    'stats.operational',
  ],
  guardian: [
    'student.view',
    'absence.notify',
    'results.view',
    'payment.submit',
    'billing.view',
    'ticket.create',
    'stats.operational',
  ],
};
