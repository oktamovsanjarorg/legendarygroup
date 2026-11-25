import {
  type AcquisitionSource,
  type LeadDto,
  LeadExistsDetails,
  type LeadStatsDto,
  type LeadStatus,
  normalizePhone,
} from '@lg/contracts';
import { ApiError } from '@lg/ui-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi, useClock } from './deps.js';
import type { NewStudentForm } from './staff-new.js';

const KEY = ['staff', 'leads'] as const;

export interface LeadForm {
  fullName: string;
  phone: string;
  courseId: string | null;
  source: AcquisitionSource | null;
  notes: string;
}

export const leadForm = (l?: LeadDto): LeadForm => ({
  fullName: l?.fullName ?? '',
  phone: l?.phone ?? '',
  courseId: l?.course?.id ?? null,
  source: l?.source ?? null,
  notes: l?.notes ?? '',
});

export const leadReady = (f: LeadForm) =>
  f.fullName.trim().length >= 2 && normalizePhone(f.phone) !== null;

export const leadRequest = (f: LeadForm) => ({
  fullName: f.fullName.trim(),
  phone: f.phone.trim(),
  courseId: f.courseId,
  source: f.source,
  notes: f.notes.trim() || null,
});

/** Aylantirish: yuborilmagan maydon lid'dan olinadi; guruh — ixtiyoriy. */
export function convertRequest(f: NewStudentForm, allowDuplicate: boolean) {
  const gPhone = f.guardianPhone.trim();
  const gName = f.guardianName.trim() || `${f.fullName.trim()} ota-onasi`;
  return {
    student: {
      fullName: f.fullName.trim(),
      ...(f.birthDate ? { birthDate: f.birthDate } : {}),
      phone: f.phone.trim() || null,
      guardians: gPhone
        ? [{ fullName: gName, phone: gPhone, relation: 'guardian', isPrimary: true }]
        : [],
      allowDuplicate,
    },
    enroll: f.groupId ? { groupId: f.groupId, startDate: f.startDate } : null,
  };
}

/** 409 `LEAD_EXISTS` — o'sha ochiq lid. */
export function existingLeadId(e: unknown): string | null {
  if (!(e instanceof ApiError) || e.code !== 'LEAD_EXISTS') return null;
  const d = LeadExistsDetails.safeParse(e.details);
  return d.success ? d.data.leadId : null;
}

export function useLeads(status: LeadStatus, q: string) {
  const api = useApi();
  const term = q.trim();
  return useQuery({
    queryKey: [...KEY, 'list', status, term],
    queryFn: () =>
      api.request<LeadDto[]>(
        `/leads?status=${status}${term ? `&q=${encodeURIComponent(term)}` : ''}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useLeadStats() {
  const api = useApi();
  const to = useClock().today();
  const from = `${to.slice(0, 7)}-01`;
  return useQuery({
    queryKey: [...KEY, 'stats', from, to],
    queryFn: () => api.request<LeadStatsDto>(`/leads/stats?from=${from}&to=${to}`),
  });
}

export function useLead(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'one', id],
    queryFn: () => api.request<LeadDto>(`/leads/${id}`),
  });
}

/** `POST/PATCH` amallari: har biri lid ma'lumotini yangilaydi. */
export function useLeadSave(id?: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { path?: 'status' | 'trial' | 'convert'; body: object }) =>
      api.request<LeadDto>(['/leads', id, a.path].filter(Boolean).join('/'), {
        method: id && !a.path ? 'PATCH' : 'POST',
        body: a.body,
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
