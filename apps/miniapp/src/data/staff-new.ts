import type { CreateStudentRequest, GroupListItem, StudentDetail } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

export interface NewStudentForm {
  fullName: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  groupId: string;
  startDate: string;
}

export const emptyNewStudent = (today: string): NewStudentForm => ({
  fullName: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  groupId: '',
  startDate: today,
});

/** Ism va guruh majburiy; ota-ona ismi yozilsa — telefoni ham. */
export function newStudentValid(f: NewStudentForm, today: string, groupOptional = false): boolean {
  const guardianOk = f.guardianName.trim() === '' || f.guardianPhone.trim() !== '';
  return (
    f.fullName.trim().length >= 3 &&
    (groupOptional || f.groupId !== '') &&
    f.startDate !== '' &&
    f.startDate <= today &&
    guardianOk
  );
}

/** Ekran → API (Q-97): bitta so'rov — o'quvchi, ota-ona, guruh. */
export function newStudentRequest(
  f: NewStudentForm,
  allowDuplicate: boolean,
): CreateStudentRequest {
  const gPhone = f.guardianPhone.trim();
  const gName = f.guardianName.trim() || `${f.fullName.trim()} ota-onasi`;
  return {
    fullName: f.fullName.trim(),
    phone: f.phone.trim() || null,
    guardians: gPhone
      ? [{ fullName: gName, phone: gPhone, relation: 'guardian', isPrimary: true }]
      : [],
    enrollment: { groupId: f.groupId, startDate: f.startDate },
    allowDuplicate,
  };
}

/** Yozish mumkin bo'lgan guruhlar (yakunlanmaganlar — server standarti). */
export function useOpenGroups() {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'groups'],
    queryFn: () => api.request<GroupListItem[]>('/groups'),
  });
}

export function useCreateStudent() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStudentRequest) =>
      api.request<StudentDetail>('/students', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
