import { MANDATORY_NOTIFICATION_TYPES, type NotificationType } from '@lg/contracts';

export const NOTIFICATION_TITLES_UZ: Record<NotificationType, string> = {
  attendance_absent: 'Darsga kelmadi',
  attendance_late: 'Darsga kechikdi',
  billing_invoice_created: 'Yangi toʻlov hisobi',
  billing_payment_confirmed: 'Toʻlov qabul qilindi',
  billing_reminder: 'Toʻlov muddati eslatmasi',
  grade_recorded: 'Yangi baho',
  test_results_published: 'Test natijasi',
  announcement: 'Markaz eʼloni',
};

/**
 * Bildirishnoma turi majburiy ekanligini tekshiradi (FR-RPT-4: o'chirib bo'lmaydi).
 */
export function isNotificationMandatory(type: NotificationType): boolean {
  return (MANDATORY_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/**
 * Bildirishnoma sozlamasini o'zgartirish mumkinligini tekshiradi.
 * Majburiy bildirishnomalarni o'chirib (enabled=false) bo'lmaydi.
 */
export function validatePreferenceUpdate(
  type: NotificationType,
  enabled: boolean,
): { valid: boolean; reason?: string } {
  if (isNotificationMandatory(type) && !enabled) {
    return {
      valid: false,
      reason: 'Majburiy bildirishnoma turini oʻchirib boʻlmaydi (FR-RPT-4)',
    };
  }
  return { valid: true };
}

type TemplateRenderer = (payload: Record<string, unknown>) => { title: string; body: string };

const TEMPLATE_RENDERERS: Record<NotificationType, TemplateRenderer> = {
  attendance_absent: (p) => ({
    title: 'Davomat: Darsga kelmadi',
    body: `${p.studentName ?? 'Oʻquvchi'} bugun (${p.date ?? ''}) ${p.groupName ?? 'Guruh'} guruh darsiga kelmadi.`,
  }),
  attendance_late: (p) => ({
    title: 'Davomat: Darsga kechikish',
    body: `${p.studentName ?? 'Oʻquvchi'} ${p.groupName ?? 'Guruh'} guruh darsiga ${p.minutes ?? 15} daqiqa kechikib keldi.`,
  }),
  billing_invoice_created: (p) => ({
    title: 'Toʻlov hisob-fakturasi',
    body: `${p.studentName ?? 'Oʻquvchi'} uchun ${p.period ?? ''} davri toʻlovi yaratildi: ${p.amount ?? ''} soʻm. Muddat: ${p.dueDate ?? ''}.`,
  }),
  billing_payment_confirmed: (p) => ({
    title: 'Toʻlov tasdiqlandi',
    body: `${p.studentName ?? 'Oʻquvchi'} uchun ${p.amount ?? ''} soʻm toʻlov muvaffaqiyatli qabul qilindi. Rahmat!`,
  }),
  billing_reminder: (p) => ({
    title: 'Toʻlov eslatmasi',
    body: `Hurmatli ota-ona! ${p.studentName ?? 'Oʻquvchi'} uchun toʻlov muddati yaqinlashmoqda: ${p.dueDate ?? ''}.`,
  }),
  grade_recorded: (p) => ({
    title: 'Yangi baho',
    body: `${p.studentName ?? 'Oʻquvchi'} ${p.groupName ?? 'Guruh'} fanidan baho oldi: ${p.grade ?? ''}.`,
  }),
  test_results_published: (p) => ({
    title: 'Test natijasi',
    body: `${p.studentName ?? 'Oʻquvchi'} qatnashgan "${p.testTitle ?? ''}" testi natijalari eʼlon qilindi: ${p.score ?? ''} ball.`,
  }),
  announcement: (p) => ({
    title: String(p.title ?? 'Markaz eʼloni'),
    body: String(p.message ?? ''),
  }),
};

/**
 * Bildirishnoma shablonini o'zbek tilida render qiladi (i18n).
 */
export function renderNotificationTemplate(
  type: NotificationType,
  payload: Record<string, unknown>,
): { title: string; body: string } {
  const renderer = TEMPLATE_RENDERERS[type] ?? TEMPLATE_RENDERERS.announcement;
  return renderer(payload);
}
