import type { HolidayDto, LessonDto } from '@lg/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { ORG_KEY } from './staff-org.js';
import { weekDates } from './time.js';

export interface LessonWhen {
  date: string;
  startTime: string;
  endTime: string;
  /** `undefined` — guruh/dars xonasi. */
  roomId?: string | null;
}

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Sana o'tmagan, dars kamida 15 daqiqa (server qoidasi). */
export const whenReady = (w: LessonWhen, today: string): boolean =>
  w.date >= today &&
  w.startTime !== '' &&
  w.endTime !== '' &&
  minutes(w.endTime) - minutes(w.startTime) >= 15;

/** Dars bilan nima qilish mumkin (server ham tekshiradi). */
export function lessonActions(l: LessonDto, today: string) {
  const open = l.date.slice(0, 7) >= today.slice(0, 7);
  const cancelled = l.status === 'cancelled';
  return {
    cancel: !cancelled && open,
    move: l.status === 'scheduled' && open,
    replace: !cancelled,
    restore:
      cancelled && l.cancelSource === 'manual' && l.compensation !== 'makeup' && l.date >= today,
    makeup: cancelled && l.compensation !== 'makeup' && open,
    attendance: !cancelled && l.date <= today,
  };
}

/** Hafta darslari (bitta so'rov — kunlar orasida kutmasdan). */
export function useWeekLessons(date: string) {
  const api = useApi();
  const week = weekDates(date);
  return useQuery({
    queryKey: [...ORG_KEY, 'week', week[0]],
    queryFn: () => api.request<LessonDto[]>(`/lessons?from=${week[0]}&to=${week[6]}`),
    placeholderData: keepPreviousData,
  });
}

export function useLesson(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'lesson', id],
    queryFn: () => api.request<LessonDto>(`/lessons/${id}`),
  });
}

export function useHolidays(year: number) {
  const api = useApi();
  return useQuery({
    queryKey: [...ORG_KEY, 'holidays', year],
    queryFn: () => api.request<HolidayDto[]>(`/holidays?year=${year}`),
    placeholderData: keepPreviousData,
  });
}
