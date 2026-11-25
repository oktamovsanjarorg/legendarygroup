import {
  type CreateStaffRequest,
  DELEGABLE_PERMISSIONS,
  normalizePhone,
  type Permission,
  ROLE_PERMISSIONS,
  type RoleCode,
  STAFF_ROLES,
  type StaffDetail,
  type StaffListItem,
  type StaffRole,
  type UpdateStaffRequest,
} from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'people'] as const;

/** Xodim rollari (ota-ona/o'quvchi roli bu yerda boshqarilmaydi). */
export const isStaffRole = (r: RoleCode): r is 'director' | StaffRole =>
  r === 'director' || STAFF_ROLES.some((s) => s === r);

export function usePeople() {
  const api = useApi();
  return useQuery({ queryKey: KEY, queryFn: () => api.request<StaffListItem[]>('/staff') });
}

export function usePerson(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.request<StaffDetail>(`/staff/${id}`),
  });
}

export interface PersonForm {
  fullName: string;
  phone: string;
}

export const personValid = (f: PersonForm): boolean =>
  f.fullName.trim().length >= 2 && normalizePhone(f.phone) !== null;

export const createBody = (f: PersonForm, role: StaffRole): CreateStaffRequest => ({
  fullName: f.fullName.trim(),
  phone: normalizePhone(f.phone) ?? f.phone,
  role,
});

/** Faqat o'zgargan maydonlar; o'zgarish yo'q — `null`. */
export function updateBody(
  f: PersonForm,
  s: Pick<StaffDetail, 'fullName' | 'phone'>,
): UpdateStaffRequest | null {
  const next = createBody(f, 'teacher');
  const body = {
    ...(next.fullName !== s.fullName && { fullName: next.fullName }),
    ...(next.phone !== s.phone && { phone: next.phone }),
  };
  return Object.keys(body).length > 0 ? body : null;
}

export interface PermissionRow {
  permission: Permission;
  /** Rol standartida bor (aks holda — delegatsiya qilinadigan, 02 §4 «D»). */
  inRole: boolean;
  /** Hozir amalda. */
  effective: boolean;
}

/** 02 §4 override qoidasi: xodim rollari ruxsati (cheklash) + Admin uchun delegatsiya. */
export function permissionRows(s: Pick<StaffDetail, 'roles' | 'overrides'>): PermissionRow[] {
  const override = new Map(s.overrides.map((o) => [o.permission, o.granted]));
  const base = new Set(s.roles.filter(isStaffRole).flatMap((r) => ROLE_PERMISSIONS[r]));
  const extra = s.roles.includes('admin') ? DELEGABLE_PERMISSIONS.filter((p) => !base.has(p)) : [];
  return [
    ...[...base].map((permission) => ({
      permission,
      inRole: true,
      effective: override.get(permission) !== false,
    })),
    ...extra.map((permission) => ({
      permission,
      inRole: false,
      effective: override.get(permission) === true,
    })),
  ];
}

/** Almashtirish so'rovi: standartga qaytsa — override o'chadi. */
export const toggleCall = (id: string, r: PermissionRow) => {
  const path = `/rbac/users/${id}/overrides/${r.permission}`;
  return r.effective === r.inRole
    ? { path, method: 'PUT' as const, body: { granted: !r.effective } }
    : { path, method: 'DELETE' as const };
};
