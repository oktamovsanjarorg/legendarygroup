import {
  type AcquisitionSource,
  CreateStudentRequest,
  type Gender,
  type GuardianRelation,
  type StudentDetail,
  UpdateStudentRequest,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';

export interface StudentDraft {
  /** T-127: boʻsh — avtomatik raqam. */
  code: string;
  fullName: string;
  birthDate: string;
  gender: Gender | '';
  phone: string;
  school: string;
  grade: string;
  source: AcquisitionSource | '';
  notes: string;
}

export interface GuardianDraft {
  fullName: string;
  phone: string;
  relation: GuardianRelation;
}

export type StudentErrors = Partial<Record<keyof typeof t.students.form.errors, string>>;

export const EMPTY_STUDENT: StudentDraft = {
  code: '',
  fullName: '',
  birthDate: '',
  gender: '',
  phone: '',
  school: '',
  grade: '',
  source: '',
  notes: '',
};
export const EMPTY_GUARDIAN: GuardianDraft = { fullName: '', phone: '+998', relation: 'mother' };

export const draftOf = (s: StudentDetail): StudentDraft => ({
  code: String(s.code),
  fullName: s.fullName,
  birthDate: s.birthDate ?? '',
  gender: s.gender ?? '',
  phone: s.phone ?? '',
  school: s.school ?? '',
  grade: s.grade ?? '',
  source: s.source ?? '',
  notes: s.notes ?? '',
});

const orNull = (v: string) => v.trim() || null;

/** Boʻsh — `undefined` (avtomatik / oʻzgarmaydi); raqam boʻlmasa — `NaN` (Zod rad etadi). */
const codeOf = (v: string): number | undefined => {
  const text = v.trim();
  if (!text) return undefined;
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
};

const fields = (d: StudentDraft) => ({
  code: codeOf(d.code),
  fullName: d.fullName,
  birthDate: orNull(d.birthDate),
  gender: d.gender || null,
  phone: orNull(d.phone),
  school: orNull(d.school),
  grade: orNull(d.grade),
  source: d.source || null,
  notes: orNull(d.notes),
});

/** Ota-ona bo'limi to'ldirilganmi (standart `+998` — bo'sh hisoblanadi). */
export const guardianFilled = (g: GuardianDraft): boolean =>
  g.fullName.trim() !== '' || !['', '+998'].includes(g.phone.replaceAll(' ', ''));

/** Zod yo'li → forma maydoni (`guardians.0.phone` → `guardianPhone`). */
function errorsOf(issues: readonly { path: PropertyKey[] }[]): StudentErrors {
  const texts = t.students.form.errors;
  const out: StudentErrors = {};
  for (const { path } of issues) {
    const [head, , leaf] = path;
    if (head === 'guardians') {
      const key = leaf === 'phone' ? 'guardianPhone' : 'guardianName';
      out[key] = texts[key];
    } else if (head === 'code' || head === 'fullName' || head === 'phone' || head === 'birthDate') {
      out[head] = texts[head];
    }
  }
  return out;
}

/** `POST /students` (API bilan bitta Zod sxema): birinchi ota-ona — asosiy. */
export function createBody(d: StudentDraft, g: GuardianDraft, allowDuplicate: boolean) {
  const guardians = guardianFilled(g) ? [{ ...g, isPrimary: true }] : [];
  const parsed = CreateStudentRequest.safeParse({ ...fields(d), guardians, allowDuplicate });
  return parsed.success
    ? { ok: true as const, body: parsed.data }
    : { ok: false as const, errors: errorsOf(parsed.error.issues) };
}

/** `PATCH /students/:id` — barcha maydonlar (bo'sh — `null`). */
export function updateBody(d: StudentDraft) {
  const parsed = UpdateStudentRequest.safeParse(fields(d));
  return parsed.success
    ? { ok: true as const, body: parsed.data }
    : { ok: false as const, errors: errorsOf(parsed.error.issues) };
}
