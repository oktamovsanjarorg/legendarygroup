import type { RoleCode, StudentDetail, StudentGuardian, StudentListItem } from '@lg/contracts';
import type { GuardianRow, StudentGuardianRow, StudentRow } from '@lg/db';

/** Kim ko'ryapti — field-level filtr (02 §3) uchun. */
export interface Viewer {
  role: RoleCode;
  /** Ota-ona sifatida kirgan bo'lsa — uning `guardians.id`si. */
  guardianId: string | null;
}

const isStaff = (v: Viewer) => v.role === 'director' || v.role === 'admin';

export type GuardianLink = Pick<StudentGuardianRow, 'relation' | 'isPrimary' | 'notify'> & {
  guardian: Pick<GuardianRow, 'id' | 'fullName' | 'phone' | 'userId'>;
};

export function toListItem(r: StudentRow): StudentListItem {
  return {
    id: r.id,
    code: r.code,
    fullName: r.fullName,
    birthDate: r.birthDate,
    phone: r.phone,
    archivedAt: r.archivedAt?.toISOString() ?? null,
  };
}

/**
 * Ota-ona telefoni: Director/Admin — hammasi; Ota-ona — faqat o'ziniki; Ustoz — yo'q
 * (Q-63: Director yoqishi mumkin — T-114).
 */
function guardianPhone(link: GuardianLink, v: Viewer): string | null {
  if (isStaff(v)) return link.guardian.phone;
  if (v.guardianId !== null && v.guardianId === link.guardian.id) return link.guardian.phone;
  return null;
}

export function toGuardian(link: GuardianLink, v: Viewer): StudentGuardian {
  return {
    guardianId: link.guardian.id,
    fullName: link.guardian.fullName,
    phone: guardianPhone(link, v),
    relation: link.relation,
    isPrimary: link.isPrimary,
    notify: link.notify,
    linked: link.guardian.userId !== null,
  };
}

/** Ichki maydonlar (manba, izoh) — faqat xodimlarga (Q-67). */
export function toDetail(r: StudentRow, links: readonly GuardianLink[], v: Viewer): StudentDetail {
  const staff = isStaff(v);
  return {
    ...toListItem(r),
    gender: r.gender,
    school: r.school,
    grade: r.grade,
    source: staff ? r.source : null,
    notes: staff ? r.notes : null,
    photoFileId: r.photoFileId,
    guardians: links.map((l) => toGuardian(l, v)),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const STUDENT_AUDIT_FIELDS = [
  'fullName',
  'birthDate',
  'gender',
  'phone',
  'school',
  'grade',
  'source',
  'notes',
  'photoFileId',
  'archivedAt',
] as const;
