import {
  type Course,
  DEFAULT_SYSTEM_SETTINGS,
  type GroupListItem,
  type PublicSettings,
  type Room,
  type StaffListItem,
  type StudentListResult,
  type SystemSettings,
} from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';

/** Qadam holati: `count` — kiritilganlar soni (`null` — sanalmaydi), `done` — bajarilganmi. */
export interface StepStatus {
  done: boolean;
  count: number | null;
}

const def = DEFAULT_SYSTEM_SETTINGS.centerInfo;

/** Markaz ma'lumoti standart (seed) qiymatdan o'zgartirilgan bo'lsa — kiritilgan. */
export const centerFilled = (s: SystemSettings): boolean =>
  s.centerInfo.name !== def.name ||
  s.centerInfo.phone !== def.phone ||
  s.centerInfo.address !== def.address;

const count = (n: number | undefined): StepStatus =>
  n === undefined ? { done: false, count: null } : { done: n > 0, count: n };

/**
 * Har qadam holati haqiqiy ma'lumotdan (T-117 "progress saqlanadi"): sozlamalar, kurslar,
 * xonalar, ustozlar, guruhlar, o'quvchilar. Mavjud ro'yxat kalitlari — qo'shilgach yangilanadi.
 */
export function useSetup() {
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.request<SystemSettings>('/settings'),
  });
  const courses = useQuery({
    queryKey: ['org', 'courses', 'active'],
    queryFn: () => api.request<Course[]>('/courses?status=active'),
  });
  const rooms = useQuery({
    queryKey: ['org', 'rooms', 'active'],
    queryFn: () => api.request<Room[]>('/rooms?status=active'),
  });
  const staff = useQuery({
    queryKey: ['staff', 'list'],
    queryFn: () => api.request<StaffListItem[]>('/staff'),
  });
  const groups = useQuery({
    queryKey: ['groups', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
  });
  const students = useQuery({
    queryKey: ['students', 'wizard-count'],
    queryFn: () => api.request<StudentListResult>('/students?status=active'),
  });
  const pub = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.request<PublicSettings>('/settings/public'),
  });
  const s = settings.data;
  const steps: StepStatus[] = [
    { done: s ? centerFilled(s) : false, count: null },
    count(s?.paymentCards.length),
    count(courses.data?.length),
    count(rooms.data?.length),
    count(staff.data?.filter((x) => x.roles.includes('teacher')).length),
    count(groups.data?.length),
    // Ro'yxat sahifalangan — son emas, faqat bor/yo'q.
    { done: (students.data?.items.length ?? 0) > 0, count: null },
    { done: false, count: null },
  ];
  return { steps, botUrl: pub.data?.botUrl ?? null };
}
