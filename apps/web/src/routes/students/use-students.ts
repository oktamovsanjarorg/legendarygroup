import {
  type EnrollmentDto,
  type GuardianLookupResult,
  normalizePhone,
  type OrgListFilter,
  type StudentDetail,
  type StudentListResult,
} from '@lg/contracts';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export interface StudentListParams {
  q: string;
  status: OrgListFilter;
}

/** Ro'yxat (FR-STU-5): qidiruv + cursor sahifalash ("Yana yuklash"). */
export const useStudents = (p: StudentListParams) =>
  useInfiniteQuery({
    queryKey: ['students', 'list', p],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ status: p.status });
      if (p.q) q.set('q', p.q);
      if (pageParam) q.set('cursor', pageParam);
      return api.request<StudentListResult>(`/students?${q.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const useStudent = (id: string) =>
  useQuery({
    queryKey: ['students', 'detail', id],
    queryFn: () => api.request<StudentDetail>(`/students/${id}`),
  });

export const useEnrollments = (id: string) =>
  useQuery({
    queryKey: ['students', 'enrollments', id],
    queryFn: () => api.request<EnrollmentDto[]>(`/students/${id}/enrollments`),
  });

/** FR-STU-2: telefon bo'yicha mavjud ota-onani topish (raqam to'liq kiritilgach). */
export function useGuardianLookup(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  return useQuery({
    queryKey: ['guardians', 'lookup', phone],
    queryFn: () =>
      api.request<GuardianLookupResult>(
        `/guardians/lookup?phone=${encodeURIComponent(phone ?? '')}`,
      ),
    enabled: phone !== null,
    // Keshlanmaydi: hozirgina qo'shilgan ota-ona keyingi formada darhol topilishi kerak.
    staleTime: 0,
    gcTime: 0,
  });
}

export interface StudentCall {
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** O'quvchi/ota-ona/yozilish yozish amallari: ro'yxat, kartochka va guruh sonlari yangilanadi. */
export function useStudentCall<T = unknown>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, ...init }: StudentCall) => api.request<T>(path, init),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['guardians'] });
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
