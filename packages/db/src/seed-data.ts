import type { Permission, RoleCode } from '@lg/contracts';

// Matn rasmiy imloda: oʻ/gʻ — U+02BB, tutuq — U+02BC.
// TODO(T-009): UI matnlari @lg/i18n ga o'tgach, bu yerda faqat admin uchun texnik tavsif qoladi.

export const ROLE_NAMES: Record<RoleCode, string> = {
  director: 'Direktor',
  admin: 'Admin',
  teacher: 'Ustoz',
  guardian: 'Ota-ona',
};

/** docs/02-roles-permissions.md §4 "Tavsif" ustuni. */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'staff.manage': 'Admin/Ustoz qoʻshish, bloklash',
  'staff.permissions': 'Ruxsat berish/olish',
  'settings.manage': 'Tizim sozlamalari, karta rekvizitlari, shablonlar',
  'audit.view': 'Audit jurnali',
  'course.manage': 'Kurs, xona',
  'group.manage': 'Guruh, jadval, ustoz biriktirish',
  'group.view': 'Guruhlarni koʻrish',
  'lesson.manage': 'Dars bekor qilish/koʻchirish, oʻrinbosar tayinlash',
  'student.manage': 'Oʻquvchi, ota-ona, enrollment, muzlatish',
  'student.view': 'Oʻquvchi kartochkasi',
  'lead.manage': 'Lidlar',
  'attendance.mark': 'Davomat belgilash',
  'attendance.edit_past': 'Oʻtgan davomatni oʻzgartirish (sabab bilan)',
  'absence.notify': '“Kela olmaydi” oldindan xabar',
  'grade.write': 'Baho, izoh',
  'test.manage': 'Test yaratish, Excel import, eʼlon qilish',
  'results.view': 'Baho, test natijalari',
  'payment.create': 'Toʻlov kiritish (naqd/terminal)',
  'payment.submit': 'Oʻtkazma chekini yuborish',
  'payment.review': 'Chekni tasdiqlash/rad etish',
  'payment.reverse': 'Storno',
  'payment.refund': 'Pulni qaytarish',
  'discount.grant': 'Chegirma',
  'penalty.waive': 'Jarimani bekor qilish',
  'billing.view': 'Qarz, balans, toʻlovlar tarixi',
  'cash.close': 'Kassa kunlik yopish',
  'expense.manage': 'Xarajatlar',
  'finance.view': 'P&L, tushum hisobotlari, prognoz',
  'payroll.manage': 'Ustoz shartnomasi, oylik hisob, tasdiqlash',
  'payroll.view_own': 'Oʻz oyligini koʻrish',
  'announcement.send': 'Ommaviy eʼlon',
  'ticket.handle': 'Ota-ona murojaatlariga javob',
  'ticket.create': 'Murojaat yuborish',
  'stats.operational': 'Davomat/natija statistikasi',
  'approval.decide': 'Tasdiqlash soʻrovlarini hal qilish',
};

/** Faqat local/staging. Productionda birinchi Director — `pnpm cli director:create`. */
export const TEST_DIRECTOR = {
  fullName: 'Test Direktor',
  phone: '+998900000001',
} as const;
