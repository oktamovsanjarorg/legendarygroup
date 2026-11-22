import type { EnrollmentDto, StudentDetail } from '@lg/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

export interface ManageGroup {
  enrollmentId: string;
  name: string;
  startDate: string;
}

export interface StudentManage {
  /** Chiqish sanasi qo'yilmagan a'zoliklar — kartochkadan «Guruhdan chiqarish». */
  groups: readonly ManageGroup[];
  /** Q-93: chiqish sanasi yo'q yoki bugundan keyin — arxivlab bo'lmaydi (server ham 409). */
  canArchive: boolean;
  archived: boolean;
}

export function studentManage(
  enrollments: readonly EnrollmentDto[],
  archivedAt: string | null,
  today: string,
): StudentManage {
  const open = enrollments.filter((e) => e.endDate === null);
  return {
    groups: open.map((e) => ({ enrollmentId: e.id, name: e.group.name, startDate: e.startDate })),
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

/** FR-STU-6: arxivlash / arxivdan chiqarish (o'chirish yo'q). */
export function useArchiveStudent(studentId: string) {
  const api = useApi();
  const invalidate = useInvalidateStudent();
  return useMutation({
    mutationFn: (verb: 'archive' | 'restore') =>
      api.request<StudentDetail>(`/students/${studentId}/${verb}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}
