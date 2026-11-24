import { MANDATORY_NOTIFICATION_TYPES, type NotificationType } from '@lg/contracts';

export const NOTIFICATION_TITLES_UZ: Record<NotificationType, string> = {
  attendance_absent: 'Darsga kelmadi',
  attendance_late: 'Darsga kechikdi',
  attendance_correction: 'Davomat tuzatildi',
  billing_invoice_created: 'Yangi toʻlov hisobi',
  billing_payment_confirmed: 'Toʻlov qabul qilindi',
  billing_reminder: 'Toʻlov muddati eslatmasi',
  grade_recorded: 'Yangi baho',
  test_results_published: 'Test natijasi',
  weekly_parent_report: 'Haftalik xulosa',
  monthly_parent_report: 'Oylik hisobot',
  announcement: 'Markaz eʼloni',
  approval_decided: 'Soʻrov natijasi',
  link_approved: 'Profil bogʻlandi',
  ticket_reply: 'Murojaatga javob',
  staff_task: 'Yangi ish (xodim)',
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
  attendance_correction: (p) => ({
    title: 'Davomat: Farzandingiz darsda',
    body: `Uzr, xatolik yuz bergan: ${p.studentName ?? 'Farzandingiz'} bugun darsda qatnashmoqda.`,
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
    body: `Hurmatli ota-ona! ${p.studentName ?? 'Oʻquvchi'} boʻyicha toʻlanmagan summa: ${p.amount ?? ''} soʻm${p.dueDate ? `, muddat: ${p.dueDate}` : ''}.`,
  }),
  grade_recorded: (p) => ({
    title: 'Yangi baho',
    body: `${p.studentName ?? 'Oʻquvchi'} ${p.groupName ?? 'Guruh'} fanidan baho oldi: ${p.grade ?? ''}.`,
  }),
  test_results_published: (p) => ({
    title: 'Test natijasi',
    body: `${p.studentName ?? 'Oʻquvchi'} qatnashgan "${p.testTitle ?? ''}" testi natijalari eʼlon qilindi: ${p.score ?? ''} ball.`,
  }),
  weekly_parent_report: (p) => ({
    title: `Haftalik xulosa: ${p.studentName ?? 'Farzandingiz'}`,
    body: `📅 Davomat: ${p.attendedLessons ?? 0}/${p.totalLessons ?? 0} dars\n⭐️ Oʻrtacha baho: ${p.averageGrade ?? 0}\n💳 Toʻlov holati: ${p.paymentStatus ?? 'Toʻlangan'}${p.comments ? `\n📝 Ustoz izohi: ${p.comments}` : ''}${p.miniAppUrl ? `\n\nBatafsil: ${p.miniAppUrl}` : ''}`,
  }),
  monthly_parent_report: (p) => ({
    title: `Oylik hisobot: ${p.studentName ?? 'Farzandingiz'}`,
    body: `📊 Davomat: ${p.attendancePercent ?? 0}%\n⭐️ Oʻrtacha baho: ${p.averageGrade ?? 0}\n📝 Test natijalari: ${p.testScore ?? '—'}\n🏆 Guruhdagi oʻrni: ${p.rank ?? '—'}/${p.totalStudents ?? '—'}${p.miniAppUrl ? `\n\nBatafsil: ${p.miniAppUrl}` : ''}`,
  }),
  announcement: (p) => ({
    title: String(p.title ?? 'Markaz eʼloni'),
    body: String(p.message ?? p.body ?? ''),
  }),
  approval_decided: (p) => ({
    title: p.decision === 'approved' ? 'Soʻrovingiz tasdiqlandi' : 'Soʻrovingiz rad etildi',
    body: `${String(p.typeLabel ?? 'Soʻrov')}${p.note ? `\nIzoh: ${String(p.note)}` : ''}`,
  }),
  link_approved: () => ({
    title: 'Profilingiz bogʻlandi',
    body: 'Farzandingizning davomati, baholari va toʻlovlari endi ilovada koʻrinadi.',
  }),
  ticket_reply: (p) => ({
    title: `Murojaatingizga javob: ${String(p.subject ?? '')}`,
    body: String(p.text ?? ''),
  }),
  staff_task: (p) => ({ title: String(p.title ?? ''), body: String(p.body ?? '') }),
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

const escapeHtml = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * Telegram `sendMessage` matni. HTML + escape: avvalgi `Markdown` da ism, e'lon yoki havoladagi juftsiz
 * `_`/`*`/`[` xabarni butunlay rad ettirardi ("can't parse entities").
 */
export function telegramMessage(rendered: { title: string; body: string }): {
  text: string;
  parse_mode: 'HTML';
} {
  const body = escapeHtml(rendered.body);
  const text = rendered.title ? `<b>${escapeHtml(rendered.title)}</b>\n\n${body}` : body;
  return { text, parse_mode: 'HTML' };
}
