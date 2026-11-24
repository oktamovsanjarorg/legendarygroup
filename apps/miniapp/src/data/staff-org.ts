import type { Course, GroupListItem, LessonDto, Room } from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { useApi, useClock } from './deps.js';
import { addDays } from './time.js';

export const ORG_KEY = ['staff', 'org'] as const;

export function useCourses(status: 'active' | 'archived' = 'active', enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'courses', status],
    queryFn: () => api.request<Course[]>(`/courses?status=${status}`),
    enabled,
  });
}

export function useRooms(status: 'active' | 'archived' = 'active', enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'rooms', status],
    queryFn: () => api.request<Room[]>(`/rooms?status=${status}`),
    enabled,
  });
}

export function useGroups(status: 'current' | 'completed' | 'all' = 'current') {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'groups', status],
    queryFn: () => api.request<GroupListItem[]>(`/groups?status=${status}`),
  });
}

/** Guruhning yaqin 14 kundagi rejalashtirilgan (hali boshlanmagan) darslari. */
export function useUpcomingLessons(groupId: string | null) {
  const api = useApi();
  const from = useClock().today();
  return useQuery({
    queryKey: [...ORG_KEY, 'upcoming', groupId, from],
    queryFn: async () => {
      const list = await api.request<LessonDto[]>(
        `/lessons?from=${from}&to=${addDays(from, 14)}&groupId=${groupId}`,
      );
      return list.filter((l) => l.status === 'scheduled');
    },
    enabled: groupId !== null,
  });
}
