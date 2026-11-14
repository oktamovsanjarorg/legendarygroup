/**
 * Bildirishnoma sarlavhalari o'zbek tilida (i18n)
 */
export const NOTIFICATION_TITLES_UZ: Record<string, string> = {
  attendance_absent: 'Davomat: Darsga kelmadi',
  attendance_late: 'Davomat: Darsga kechikish',
  attendance_correction: 'Davomat: Farzandingiz darsda',
  billing_invoice_created: 'Toʻlov hisob-fakturasi',
  billing_payment_confirmed: 'Toʻlov tasdiqlandi',
  billing_reminder: 'Toʻlov eslatmasi',
  grade_recorded: 'Yangi baho',
  test_results_published: 'Test natijasi',
  weekly_parent_report: 'Haftalik xulosa',
  monthly_parent_report: 'Oylik hisobot',
  announcement: 'Markaz eʼloni',
};

/**
 * Bildirishnoma shablonlari o'zbek tilida (i18n)
 */
export const notificationTemplates = {
  attendance_absent: (p: { studentName?: string; groupName?: string; date?: string }) => ({
    title: 'Davomat: Darsga kelmadi',
    body: `${p.studentName ?? 'Farzandingiz'} bugun (${p.date ?? ''}) ${p.groupName ?? 'Guruh'} guruh darsiga kelmadi.`,
  }),
  attendance_late: (p: { studentName?: string; groupName?: string; minutes?: number }) => ({
    title: 'Davomat: Darsga kechikish',
    body: `${p.studentName ?? 'Oʻquvchi'} ${p.groupName ?? 'Guruh'} guruh darsiga ${p.minutes ?? 15} daqiqa kechikib keldi.`,
  }),
  attendance_correction: (p: { studentName?: string }) => ({
    title: 'Davomat: Farzandingiz darsda',
    body: `Uzr, xatolik yuz bergan: ${p.studentName ?? 'Farzandingiz'} bugun darsda qatnashmoqda.`,
  }),
  billing_invoice_created: (p: {
    studentName?: string;
    period?: string;
    amount?: string;
    dueDate?: string;
  }) => ({
    title: 'Toʻlov hisob-fakturasi',
    body: `${p.studentName ?? 'Oʻquvchi'} uchun ${p.period ?? ''} davri toʻlovi yaratildi: ${p.amount ?? ''} soʻm. Muddat: ${p.dueDate ?? ''}.`,
  }),
  billing_payment_confirmed: (p: { studentName?: string; amount?: string }) => ({
    title: 'Toʻlov tasdiqlandi',
    body: `${p.studentName ?? 'Oʻquvchi'} uchun ${p.amount ?? ''} soʻm toʻlov muvaffaqiyatli qabul qilindi. Rahmat!`,
  }),
  billing_reminder: (p: { studentName?: string; amount?: string; dueDate?: string }) => ({
    title: 'Toʻlov eslatmasi',
    body: `Hurmatli ota-ona! ${p.studentName ?? 'Oʻquvchi'} boʻyicha toʻlanmagan summa: ${p.amount ?? ''} soʻm${p.dueDate ? `, muddat: ${p.dueDate}` : ''}.`,
  }),
  grade_recorded: (p: { studentName?: string; groupName?: string; grade?: number | string }) => ({
    title: 'Yangi baho',
    body: `${p.studentName ?? 'Oʻquvchi'} ${p.groupName ?? 'Guruh'} fanidan baho oldi: ${p.grade ?? ''}.`,
  }),
  test_results_published: (p: {
    studentName?: string;
    testTitle?: string;
    score?: number | string;
  }) => ({
    title: 'Test natijasi',
    body: `${p.studentName ?? 'Oʻquvchi'} qatnashgan "${p.testTitle ?? ''}" testi natijalari eʼlon qilindi: ${p.score ?? ''} ball.`,
  }),
  weekly_parent_report: (p: {
    studentName?: string;
    attendedLessons?: number;
    totalLessons?: number;
    averageGrade?: number;
    paymentStatus?: string;
    comments?: string;
    miniAppUrl?: string;
  }) => ({
    title: `Haftalik xulosa: ${p.studentName ?? 'Farzandingiz'}`,
    body: `📅 Davomat: ${p.attendedLessons ?? 0}/${p.totalLessons ?? 0} dars\n⭐️ Oʻrtacha baho: ${p.averageGrade ?? 0}\n💳 Toʻlov holati: ${p.paymentStatus ?? 'Toʻlangan'}${p.comments ? `\n📝 Ustoz izohi: ${p.comments}` : ''}${p.miniAppUrl ? `\n\nBatafsil: ${p.miniAppUrl}` : ''}`,
  }),
  monthly_parent_report: (p: {
    studentName?: string;
    attendancePercent?: number;
    averageGrade?: number;
    testScore?: string | number;
    rank?: number | string;
    totalStudents?: number;
    miniAppUrl?: string;
  }) => ({
    title: `Oylik hisobot: ${p.studentName ?? 'Farzandingiz'}`,
    body: `📊 Davomat: ${p.attendancePercent ?? 0}%\n⭐️ Oʻrtacha baho: ${p.averageGrade ?? 0}\n📝 Test natijalari: ${p.testScore ?? '—'}\n🏆 Guruhdagi oʻrni: ${p.rank ?? '—'}/${p.totalStudents ?? '—'}${p.miniAppUrl ? `\n\nBatafsil: ${p.miniAppUrl}` : ''}`,
  }),
  announcement: (p: { title?: string; message?: string; body?: string }) => ({
    title: String(p.title ?? 'Markaz eʼloni'),
    body: String(p.message ?? p.body ?? ''),
  }),
};
