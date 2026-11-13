import type {
  Course,
  CreateCourseRequest,
  CreateRoomRequest,
  GroupListItem,
  OrgListFilter,
  Room,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export type OrgKind = 'courses' | 'rooms';

const key = (kind: OrgKind, status: OrgListFilter) => ['org', kind, status] as const;

export const useCourses = (status: OrgListFilter) =>
  useQuery({
    queryKey: key('courses', status),
    queryFn: () => api.request<Course[]>(`/courses?status=${status}`),
  });

export const useRooms = (status: OrgListFilter) =>
  useQuery({
    queryKey: key('rooms', status),
    queryFn: () => api.request<Room[]>(`/rooms?status=${status}`),
  });

/**
 * Joriy guruhlar soni kurs/xona bo'yicha ("Guruhlar" ustuni). `group.view` bo'lmasa yoki
 * xato bo'lsa — `undefined` (ustunda "—"), ro'yxatning o'zi ishlayveradi.
 */
export function useGroupCounts(enabled: boolean) {
  const groups = useQuery({
    queryKey: ['groups', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
    enabled,
  });
  if (!groups.data) return undefined;
  const counts = new Map<string, number>();
  const bump = (id: string | undefined) => id && counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const g of groups.data) {
    bump(g.course.id);
    bump(g.room?.id);
  }
  return (id: string) => counts.get(id) ?? 0;
}

export type OrgMutation =
  | { kind: 'courses'; id?: string; body: CreateCourseRequest }
  | { kind: 'rooms'; id?: string; body: CreateRoomRequest }
  | { kind: OrgKind; id: string; archive: 'archive' | 'restore' };

/** Yaratish (POST), tahrirlash (PATCH), arxivlash/arxivdan chiqarish — T-102. */
export function useOrgMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (m: OrgMutation) => {
      if ('archive' in m) return api.request(`/${m.kind}/${m.id}/${m.archive}`, { method: 'POST' });
      return m.id
        ? api.request(`/${m.kind}/${m.id}`, { method: 'PATCH', body: m.body })
        : api.request(`/${m.kind}`, { method: 'POST', body: m.body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org'] }),
  });
}
