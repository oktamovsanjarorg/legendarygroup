import {
  type AcquisitionSource,
  type AttendanceStatus,
  type FreezeDto,
  type Gender,
  type GuardianInput,
  type GuardianLookupResult,
  type GuardianRelation,
  normalizePhone,
  type StudentDetail,
  type UpdateStudentRequest,
} from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';

/** MS-23 O'quvchi ma'lumotlari formasi (T-152): bo'sh matn — `null`. */
export interface StudentForm {
  fullName: string;
  birthDate: string;
  gender: Gender | null;
  phone: string;
  school: string;
  grade: string;
  source: AcquisitionSource | null;
  notes: string;
}

export const studentForm = (s: StudentDetail): StudentForm => ({
  fullName: s.fullName,
  birthDate: s.birthDate ?? '',
  gender: s.gender,
  phone: s.phone ?? '',
  school: s.school ?? '',
  grade: s.grade ?? '',
  source: s.source,
  notes: s.notes ?? '',
});

const blank = (v: string) => v.trim() || null;

export const studentFormReady = (f: StudentForm, today: string): boolean =>
  f.fullName.trim().length >= 2 &&
  (f.phone.trim() === '' || normalizePhone(f.phone) !== null) &&
  (f.birthDate === '' || f.birthDate <= today);

/** Faqat o'zgargan maydonlar; o'zgarish yo'q — `null`. */
export function updateStudentBody(f: StudentForm, s: StudentDetail): UpdateStudentRequest | null {
  const next = {
    fullName: f.fullName.trim(),
    birthDate: blank(f.birthDate),
    gender: f.gender,
    phone: f.phone.trim() ? normalizePhone(f.phone) : null,
    school: blank(f.school),
    grade: blank(f.grade),
    source: f.source,
    notes: blank(f.notes),
  };
  const changed = Object.entries(next).filter(([k, v]) => v !== s[k as keyof typeof next]);
  return changed.length > 0 ? (Object.fromEntries(changed) as UpdateStudentRequest) : null;
}

export interface GuardianForm {
  phone: string;
  fullName: string;
  relation: GuardianRelation;
  isPrimary: boolean;
  notify: boolean;
}

export const emptyGuardian: GuardianForm = {
  phone: '',
  fullName: '',
  relation: 'mother',
  isPrimary: false,
  notify: true,
};

/** Bazada bor ota-onaning ismi o'zgarmaydi (telefon — kalit). */
export const guardianReady = (f: GuardianForm, foundName: string | null): boolean =>
  normalizePhone(f.phone) !== null && (foundName ?? f.fullName).trim().length >= 2;

export const guardianBody = (f: GuardianForm, foundName: string | null): GuardianInput => ({
  fullName: (foundName ?? f.fullName).trim(),
  phone: normalizePhone(f.phone) ?? f.phone,
  relation: f.relation,
  isPrimary: f.isPrimary,
  notify: f.notify,
});

export function useGuardianLookup(rawPhone: string) {
  const api = useApi();
  const phone = normalizePhone(rawPhone);
  return useQuery({
    queryKey: ['staff', 'guardian-lookup', phone],
    queryFn: () =>
      api.request<GuardianLookupResult>(
        `/guardians/lookup?phone=${encodeURIComponent(phone ?? '')}`,
      ),
    enabled: phone !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

/** Muzlatishga mumkin bo'lgan amal: boshlanmagan — bekor qilish, davom etayotgan — tugatish. */
export function freezeAction(f: FreezeDto, today: string): 'cancel' | 'end' | null {
  if (f.from > today) return 'cancel';
  // Bugun boshlangani hali bir kun ham o'tmagan — kecha bilan yopib bo'lmaydi.
  return f.from < today && f.to >= today ? 'end' : null;
}

export interface AttendanceHistoryItem {
  id: string;
  date: string;
  startTime: string;
  groupName: string;
  status: AttendanceStatus;
  lateMinutes: number | null;
  note: string | null;
}

export function useAttendanceHistory(studentId: string, period: string) {
  const api = useApi();
  const last = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0));
  return useQuery({
    queryKey: ['staff', 'student', studentId, 'attendance', period],
    queryFn: () =>
      api.request<AttendanceHistoryItem[]>(
        `/attendance/history?studentId=${studentId}&from=${period}-01&to=${last.toISOString().slice(0, 10)}`,
      ),
  });
}
