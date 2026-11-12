import { z } from 'zod';
import type { Permission } from './permissions.js';

/** 07 §3: fayl yuklash — maks. 10 MB. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PDF_MIME = 'application/pdf';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface FilePurposeRule {
  mimes: readonly string[];
  maxBytes: number;
  /** Yuklash uchun ruxsat (bot ichki yo'li — xizmat tokeni bilan, foydalanuvchi nomidan). */
  upload: Permission;
  /** Boshqalar ko'rishi uchun ruxsat; yuklagan foydalanuvchi har doim ko'radi. Scope — modul service'ida. */
  view: Permission;
}

/** Fayl maqsadlari — yagona manba (FR-SYS-2). Yangi maqsad shu yerga qo'shiladi. */
export const FILE_PURPOSES = {
  /** Ota-ona o'tkazma cheki (FR-PAY-3, T-206). */
  payment_receipt: {
    mimes: [...IMAGE_MIMES, PDF_MIME],
    maxBytes: MAX_FILE_BYTES,
    upload: 'payment.submit',
    view: 'payment.review',
  },
  /** Test natijalari Excel importi (FR-GRD-4, T-302). */
  test_import: {
    mimes: [XLSX_MIME],
    maxBytes: MAX_FILE_BYTES,
    upload: 'test.manage',
    view: 'test.manage',
  },
  /** Xarajat cheki (FR-FIN-1, T-403). */
  expense_receipt: {
    mimes: [...IMAGE_MIMES, PDF_MIME],
    maxBytes: MAX_FILE_BYTES,
    upload: 'expense.manage',
    view: 'finance.view',
  },
  /**
   * O'quvchi rasmi (FR-STU-1, T-105). Umumiy `/files/:id/url` — faqat xodim (`student.manage`);
   * Ustoz/Ota-ona — scope bilan `GET /students/:id/photo` orqali.
   */
  student_photo: {
    mimes: IMAGE_MIMES,
    maxBytes: 5 * 1024 * 1024,
    upload: 'student.manage',
    view: 'student.manage',
  },
  /** Ommaviy e'lon ilovasi (FR-RPT-5, T-305). */
  announcement: {
    mimes: [...IMAGE_MIMES, PDF_MIME],
    maxBytes: MAX_FILE_BYTES,
    upload: 'announcement.send',
    view: 'announcement.send',
  },
} as const satisfies Record<string, FilePurposeRule>;

export type FilePurpose = keyof typeof FILE_PURPOSES;
export const FilePurposeSchema = z.enum(
  Object.keys(FILE_PURPOSES) as [FilePurpose, ...FilePurpose[]],
);

export const CreateUploadRequest = z.object({
  purpose: FilePurposeSchema,
  mime: z.string().min(3).max(200),
  size: z.number().int().positive(),
});

export const CreateUploadResult = z.object({
  uploadId: z.string(),
  /** Brauzer shu manzilga `multipart/form-data` POST qiladi (`fields` + `file`). */
  url: z.string(),
  fields: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});

export const FileInfo = z.object({
  id: z.string(),
  purpose: FilePurposeSchema,
  mime: z.string(),
  size: z.number(),
  sha256: z.string(),
  createdAt: z.string(),
});

export type FileInfo = z.infer<typeof FileInfo>;
