import { z } from 'zod';

/**
 * Ustozning oʻz oʻquvchi kodlari (T-128, Q-92): titul varaq va Excel importi uchun 3 xonali.
 * Har ustozda alohida baza; ustoz kiritadi, tizim boʻsh kodni taklif qiladi.
 */
export const TEACHER_CODE_MAX = 999;
export const TeacherStudentCode = z.number().int().min(1).max(TEACHER_CODE_MAX);

export const TeacherCodesQuery = z.object({ groupId: z.uuid() });

export const TeacherCodeRow = z.object({
  studentId: z.string(),
  fullName: z.string(),
  /** Ustoz bergan kod; `null` — hali berilmagan. */
  code: TeacherStudentCode.nullable(),
  /** Kod yoʻq boʻlsa — tizim taklifi (boʻsh kod); bor boʻlsa `null`. */
  suggested: TeacherStudentCode.nullable(),
});
export const TeacherCodesResult = z.object({ items: z.array(TeacherCodeRow) });

/** `PUT /api/teacher-codes`: `code: null` — kodni olib tashlash. Bir soʻrovda kod takrorlanmaydi. */
export const SaveTeacherCodesRequest = z
  .object({
    groupId: z.uuid(),
    items: z
      .array(z.object({ studentId: z.uuid(), code: TeacherStudentCode.nullable() }))
      .min(1)
      .max(200),
  })
  .refine(
    (v) => {
      const codes = v.items.flatMap((i) => (i.code === null ? [] : [i.code]));
      return new Set(codes).size === codes.length;
    },
    { message: 'DUPLICATE_CODE', path: ['items'] },
  );

export type TeacherCodeRow = z.infer<typeof TeacherCodeRow>;
export type TeacherCodesResult = z.infer<typeof TeacherCodesResult>;
export type SaveTeacherCodesRequest = z.infer<typeof SaveTeacherCodesRequest>;
