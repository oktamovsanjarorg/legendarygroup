import type {
  CreateStaffRequest,
  CreateStaffResult,
  Permission,
  RoleCode,
  StaffDetail,
  StaffInvite,
  StaffListItem,
  StaffRole,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

const LIST = ['staff'] as const;
const detailKey = (id: string) => ['staff', id] as const;

export const useStaffList = () =>
  useQuery({ queryKey: LIST, queryFn: () => api.request<StaffListItem[]>('/staff') });

export const useStaffDetail = (id: string) =>
  useQuery({ queryKey: detailKey(id), queryFn: () => api.request<StaffDetail>(`/staff/${id}`) });

export const useCreateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStaffRequest) =>
      api.request<CreateStaffResult>('/staff', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST }),
  });
};

export type StaffAction =
  | { kind: 'block' }
  | { kind: 'unblock' }
  | { kind: 'reinvite' }
  | { kind: 'addRole'; role: StaffRole }
  | { kind: 'removeRole'; role: RoleCode }
  /** `granted: null` — override olib tashlanadi (rol standarti qaytadi). */
  | { kind: 'override'; permission: Permission; granted: boolean | null };

type Call = { path: string; method: string; body?: unknown };

const call = (id: string, a: StaffAction): Call => {
  const rbac = `/rbac/users/${id}`;
  switch (a.kind) {
    case 'block':
      return { path: `${rbac}/block`, method: 'POST' };
    case 'unblock':
      return { path: `/staff/${id}/unblock`, method: 'POST' };
    case 'reinvite':
      return { path: `/staff/${id}/invite`, method: 'POST' };
    case 'addRole':
      return { path: `/staff/${id}/roles`, method: 'POST', body: { role: a.role } };
    case 'removeRole':
      return { path: `${rbac}/roles/${a.role}`, method: 'DELETE' };
    case 'override':
      return a.granted === null
        ? { path: `${rbac}/overrides/${a.permission}`, method: 'DELETE' }
        : {
            path: `${rbac}/overrides/${a.permission}`,
            method: 'PUT',
            body: { granted: a.granted },
          };
  }
};

/** Javobdagi taklif havolasi (qayta taklif yoki yangi rol uchun kanal) — bo'lsa. */
const inviteOf = (res: unknown): StaffInvite | null => {
  if (!res || typeof res !== 'object') return null;
  if ('invite' in res) return (res as CreateStaffResult).invite;
  return 'url' in res ? (res as StaffInvite) : null;
};

/** Xodim ustidagi amallar (T-101): har biri ro'yxat va tafsilotni yangilaydi. */
export const useStaffAction = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: StaffAction) => {
      const { path, ...init } = call(id, a);
      return inviteOf(await api.request<unknown>(path, init));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST }),
  });
};
