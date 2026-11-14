import { z } from 'zod';
import { ORG_LIST_FILTERS } from './org.js';
import { normalizePhone } from './phone.js';

/** O'quvchilar va ota-onalar (T-105, FR-STU-1/2/5/6, FR-AUTH-6). */

export const GENDERS = ['male', 'female'] as const;
/** Manba (FR-STU-1 "qayerdan eshitgan") — lidlar bilan umumiy (T-107). */
export const ACQUISITION_SOURCES = [
  'instagram',
  'telegram',
  'referral',
  'banner',
  'website',
  'other',
] as const;
/** Qarindoshlik (FR-STU-2): ota / ona / vasiy / boshqa. */
export const GUARDIAN_RELATIONS = ['father', 'mother', 'guardian', 'other'] as const;

export type Gender = (typeof GENDERS)[number];
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];
export type GuardianRelation = (typeof GUARDIAN_RELATIONS)[number];

/** Istalgan yozuvdagi telefon → E.164 (`normalizePhone`); yaroqsiz — `INVALID_PHONE`. */
export const PhoneInput = z.string().transform((raw, ctx) => {
  const phone = normalizePhone(raw);
  if (phone) return phone;
  ctx.addIssue({ code: 'custom', message: 'INVALID_PHONE' });
  return z.NEVER;
});

const IsoDate = z.iso.date();
const FullName = z.string().trim().min(2).max(120);
const ShortText = (max: number) => z.string().trim().min(1).max(max);

const StudentFields = z.object({
  fullName: FullName,
  birthDate: IsoDate.nullable(),
  gender: z.enum(GENDERS).nullable(),
  phone: PhoneInput.nullable(),
  school: ShortText(120).nullable(),
  grade: ShortText(20).nullable(),
  source: z.enum(ACQUISITION_SOURCES).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  photoFileId: z.uuid().nullable(),
});

export const GuardianInput = z.object({
  fullName: FullName,
  phone: PhoneInput,
  relation: z.enum(GUARDIAN_RELATIONS),
  isPrimary: z.boolean().default(false),
  /** Xabarlar shu ota-onaga boradimi (T-109). */
  notify: z.boolean().default(true),
});

/**
 * `POST /api/students`. Bir xil ism + tug'ilgan sana bo'lsa — 409 `POSSIBLE_DUPLICATE`
 * (`details.matches`); Admin tekshirib `allowDuplicate: true` bilan qayta yuboradi.
 */
export const CreateStudentRequest = StudentFields.partial()
  .required({ fullName: true })
  .extend({
    guardians: z.array(GuardianInput).max(4).default([]),
    allowDuplicate: z.boolean().default(false),
  });

export const UpdateStudentRequest = StudentFields.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'EMPTY_PATCH' },
);

export const LinkGuardianRequest = GuardianInput;
export const RenameGuardianRequest = z.object({ fullName: FullName });
export const UpdateGuardianLinkRequest = z
  .object({
    relation: z.enum(GUARDIAN_RELATIONS),
    isPrimary: z.boolean(),
    notify: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'EMPTY_PATCH' });

/** Qidiruv (FR-STU-5): `q` — ism (normalizatsiya bilan), kod yoki telefon (o'quvchi/ota-ona). */
export const StudentListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORG_LIST_FILTERS).default('active'),
  /** Guruhga bugun yozilganlar (T-106). */
  groupId: z.uuid().optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GuardianLookupQuery = z.object({ phone: PhoneInput });

export const StudentGuardianSchema = z.object({
  guardianId: z.string(),
  fullName: z.string(),
  /** Field-level (02 §3): Ustozga — `null`; Ota-onaga — faqat o'ziniki. */
  phone: z.string().nullable(),
  relation: z.enum(GUARDIAN_RELATIONS),
  isPrimary: z.boolean(),
  notify: z.boolean(),
  /** Bot orqali bog'langanmi (FR-AUTH-1). */
  linked: z.boolean(),
});

export const StudentListItem = z.object({
  id: z.string(),
  code: z.number().int(),
  fullName: z.string(),
  birthDate: z.string().nullable(),
  phone: z.string().nullable(),
  archivedAt: z.string().nullable(),
});

/**
 * Ro'yxat qatori (W-05): kartochkani ochmasdan ko'rinadigan qo'shimcha ma'lumot.
 * `guardian.phone` — field-level (02 §3): Ustozga `null`, Ota-onaga faqat o'ziniki.
 */
export const StudentListRow = StudentListItem.extend({
  /** Bugun yozilgan guruhlar (T-106). */
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Bugun yozilgan guruhlarining hammasida muzlatilgan (BR-9). */
  frozen: z.boolean(),
  /** Asosiy ota-ona. */
  guardian: z.object({ fullName: z.string(), phone: z.string().nullable() }).nullable(),
});

export const StudentDetail = StudentListItem.extend({
  gender: z.enum(GENDERS).nullable(),
  school: z.string().nullable(),
  grade: z.string().nullable(),
  /** Ichki maydonlar (manba, izoh) — faqat xodimlarga; Ota-onaga `null`. */
  source: z.enum(ACQUISITION_SOURCES).nullable(),
  notes: z.string().nullable(),
  photoFileId: z.string().nullable(),
  guardians: z.array(StudentGuardianSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const StudentListResult = z.object({
  items: z.array(StudentListRow),
  nextCursor: z.string().nullable(),
});

export const GuardianLookupResult = z.object({
  guardian: z
    .object({
      id: z.string(),
      fullName: z.string(),
      phone: z.string(),
      children: z.array(z.object({ id: z.string(), fullName: z.string(), code: z.number() })),
    })
    .nullable(),
});

export type CreateStudentRequest = z.input<typeof CreateStudentRequest>;
export type UpdateStudentRequest = z.infer<typeof UpdateStudentRequest>;
export type GuardianInput = z.infer<typeof GuardianInput>;
export type UpdateGuardianLinkRequest = z.infer<typeof UpdateGuardianLinkRequest>;
export type StudentGuardian = z.infer<typeof StudentGuardianSchema>;
export type StudentListItem = z.infer<typeof StudentListItem>;
export type StudentListRow = z.infer<typeof StudentListRow>;
export type StudentDetail = z.infer<typeof StudentDetail>;
export type StudentListResult = z.infer<typeof StudentListResult>;
export type GuardianLookupResult = z.infer<typeof GuardianLookupResult>;
