import type { EnrollmentDto, StudentDetail } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

export interface ManageGroup {
  enrollmentId: string;
  name: string;
  /** Sana va holat: "01.09.2026 dan · Muzlatilgan". */
  text: string;
}

export interface StudentManage {
  /** Yakunlanmagan a'zoliklar (rejalashtirilgan chiqish ham). */
  groups: readonly ManageGroup[];
  past: readonly ManageGroup[];
  /** Q-93: chiqish sanasi yo'q yoki bugundan keyin — arxivlab bo'lmaydi (server ham 409). */
  canArchive: boolean;
  archived: boolean;
}

/** "01.09.2026 dan · 30.11.2026 gacha". */
export const enrollmentDates = (e: Pick<EnrollmentDto, 'startDate' | 'endDate'>) =>
  [
    t.staffEnroll.since.replace('{date}', formatYmd(e.startDate)),
    e.endDate && t.staffEnroll.until.replace('{date}', formatYmd(e.endDate)),
  ]
    .filter(Boolean)
    .join(' · ');

const manageGroup = (e: EnrollmentDto): ManageGroup => {
  const dates = [
    enrollmentDates(e),
    e.state === 'ended' && e.endReason ? t.staffProfile.endReasons[e.endReason] : null,
    e.state === 'frozen' || e.state === 'upcoming' ? t.staffEnroll.states[e.state] : null,
  ];
  return {
    enrollmentId: e.id,
    name: e.group.name,
    text: dates.filter(Boolean).join(' · '),
  };
};

export function studentManage(
  enrollments: readonly EnrollmentDto[],
  archivedAt: string | null,
  today: string,
): StudentManage {
  return {
    groups: enrollments.filter((e) => e.state !== 'ended').map(manageGroup),
    past: enrollments.filter((e) => e.state === 'ended').map(manageGroup),
    canArchive: !enrollments.some((e) => e.endDate === null || e.endDate > today),
    archived: archivedAt !== null,
  };
}

export interface LeaveInput {
  endDate: string;
  reason: 'left' | 'finished';
  note: string | null;
}

const useInvalidateStudent = () => {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['staff'] });
    void qc.invalidateQueries({ queryKey: ['billing'] });
  };
};

/** FR-STU-3: guruhdan chiqarish (sana, sabab). Takror yuborish — server 409/qayta yozmaydi. */
export function useEndEnrollment(enrollmentId: string) {
  const api = useApi();
  const invalidate = useInvalidateStudent();
  return useMutation({
    mutationFn: (body: LeaveInput) =>
      api.request<EnrollmentDto>(`/enrollments/${enrollmentId}/end`, { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

/** Q-96: xato yozilgan a'zolik — butunlay (to'lov tegmagan bo'lsa; aks holda 409). */
export function useRemoveEnrollment(enrollmentId: string) {
  const api = useApi();
  const invalidate = useInvalidateStudent();
  return useMutation({
    mutationFn: () =>
      api.request<undefined>(`/billing/enrollments/${enrollmentId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

/** FR-STU-6: arxivlash / arxivdan chiqarish. */
export function useArchiveStudent(studentId: string) {
  const api = useApi();
  const invalidate = useInvalidateStudent();
  return useMutation({
    mutationFn: (verb: 'archive' | 'restore') =>
      api.request<StudentDetail>(`/students/${studentId}/${verb}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

/**
 * Q-124: arxivdagi, pul tarixi yo'q o'quvchini butunlay o'chirish (faqat Director). Kartochka
 * keshi olib tashlanadi — qayta so'ralsa 404 bo'lardi; ro'yxatlar yangilanadi.
 */
export function useDeleteStudent(studentId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.request<undefined>(`/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['staff', 'student', studentId] });
      void qc.invalidateQueries({ queryKey: ['staff'] });
      void qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}
