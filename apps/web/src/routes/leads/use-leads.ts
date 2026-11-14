import type { Course, GroupListItem, LeadDto, LeadStatsDto, LessonDto } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { todayYmd } from '../../lib/today.js';
import { addDays, addMonths } from '../../lib/ymd.js';

export const useLeads = (q: string) =>
  useQuery({
    queryKey: ['leads', 'list', q],
    queryFn: () => api.request<LeadDto[]>(q ? `/leads?q=${encodeURIComponent(q)}` : '/leads'),
    placeholderData: (prev) => prev,
  });

/** Joriy oy manba statistikasi (oyning 1-kunidan bugungacha). */
export function useLeadStats() {
  const to = todayYmd();
  const from = addMonths(to, 0);
  return useQuery({
    queryKey: ['leads', 'stats', from, to],
    queryFn: () => api.request<LeadStatsDto>(`/leads/stats?from=${from}&to=${to}`),
  });
}

type Option = { value: string; label: string };

/** Forma tanlovlari: kurslar (`course.manage` bo'lsa) va joriy guruhlar (`group.view` bo'lsa). */
export function useLeadOptions(can: { courses: boolean; groups: boolean }) {
  const courses = useQuery({
    queryKey: ['org', 'courses', 'active'],
    queryFn: () => api.request<Course[]>('/courses?status=active'),
    enabled: can.courses,
  });
  const groups = useQuery({
    queryKey: ['groups', 'list', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
    enabled: can.groups,
  });
  const opt = <T>(xs: T[] | undefined, f: (x: T) => Option): Option[] => (xs ?? []).map(f);
  return {
    courses: opt(courses.data, (c) => ({ value: c.id, label: c.name })),
    groups: opt(groups.data, (g) => ({ value: g.id, label: g.name })),
  };
}

export type LeadOptions = ReturnType<typeof useLeadOptions>;

/** Sinov uchun: guruhning yaqin 14 kundagi rejalashtirilgan darslari. */
export function useUpcomingLessons(groupId: string) {
  const from = todayYmd();
  const to = addDays(from, 14);
  return useQuery({
    queryKey: ['lessons', { from, to, groupId, teacherId: '' }],
    queryFn: () => api.request<LessonDto[]>(`/lessons?from=${from}&to=${to}&groupId=${groupId}`),
    enabled: groupId !== '',
    select: (ls) => ls.filter((l) => l.status === 'scheduled'),
  });
}

export interface LeadCall {
  path: string;
  method: 'POST' | 'PATCH';
  body?: unknown;
}

/** Lid yozish amallari (T-107); aylantirish o'quvchilar ro'yxatini ham yangilaydi. */
export function useLeadCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, ...init }: LeadCall) => api.request<LeadDto>(path, init),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leads'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
