import {
  DELEGABLE_PERMISSIONS,
  NON_DELEGABLE_PERMISSIONS,
  type Permission,
  ROLE_PERMISSIONS,
  type RoleCode,
} from '@lg/contracts';

export interface PermissionOverride {
  permission: Permission;
  granted: boolean;
}

/**
 * Faol rol bo'yicha samarali ruxsatlar (02 §1: ruxsatlar rollar orasida BIRLASHTIRILMAYDI).
 * Override'lar (`user_permission_overrides`) faqat shu rolga qo'llanadi:
 * `granted=false` — standart ruxsatni olib qo'yadi; `granted=true` — faqat Admin'ga, faqat
 * delegatsiya qilinadiganlar (boshqasi e'tiborsiz — DB'da noto'g'ri yozuv bo'lsa ham).
 */
export function effectivePermissions(
  role: RoleCode,
  overrides: readonly PermissionOverride[] = [],
): Set<Permission> {
  const result = new Set<Permission>(ROLE_PERMISSIONS[role]);
  for (const o of overrides) {
    if (!o.granted) result.delete(o.permission);
    else if (overrideError(role, o) === null) result.add(o.permission);
  }
  return result;
}

export type OverrideError = 'NON_DELEGABLE_PERMISSION' | 'OVERRIDE_NOT_ALLOWED';

/**
 * Override ruxsat etilganmi (02 §4 "Override qoidasi"). `null` — ha.
 * - delegatsiya qilinmaydigan ruxsat hech qachon Admin'ga berilmaydi;
 * - `granted=true` — faqat Admin + `DELEGABLE_PERMISSIONS`;
 * - `granted=false` — rolning standart ruxsatini cheklash (har qanday).
 */
export function overrideError(role: RoleCode, o: PermissionOverride): OverrideError | null {
  if (!o.granted)
    return ROLE_PERMISSIONS[role].includes(o.permission) ? null : 'OVERRIDE_NOT_ALLOWED';
  if ((NON_DELEGABLE_PERMISSIONS as readonly Permission[]).includes(o.permission)) {
    return 'NON_DELEGABLE_PERMISSION';
  }
  const delegable = (DELEGABLE_PERMISSIONS as readonly Permission[]).includes(o.permission);
  return role === 'admin' && delegable ? null : 'OVERRIDE_NOT_ALLOWED';
}

/**
 * Oxirgi faol Director himoyasi (02 §2): Director'ni bloklash/rolini olish — faqat undan
 * keyin kamida bitta boshqa faol Director qolsa.
 */
export const canRemoveDirector = (activeDirectorsExcludingTarget: number): boolean =>
  activeDirectorsExcludingTarget >= 1;
