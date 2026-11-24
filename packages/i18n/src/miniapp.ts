import { introMessages } from './miniapp-intro.js';
import { auditActionMessages } from './miniapp-audit.js';
import { guardianMessages } from './miniapp-guardian.js';
import { staffMessages } from './miniapp-staff.js';
import { staffListMessages } from './miniapp-staff-lists.js';
import { staffOrgMessages } from './miniapp-staff-org.js';
import { staffStudentMessages } from './miniapp-staff-students.js';
import { staffWorkMessages } from './miniapp-staff-work.js';
import { studentMessages } from './miniapp-student.js';
import { teacherMessages } from './miniapp-teacher.js';
import { webMessages } from './web.js';

/** Telegram Mini App matnlari (C-*, MT-*, MG-*, MS-* — docs/ux/screens.md). */
export const miniappMessages = {
  appTitle: 'Legendary Group',
  roles: webMessages.roles,
  openInTelegram: {
    title: 'Ilovani Telegram orqali oching',
    hint: 'Bu sahifa faqat Legendary Group boti ichida ishlaydi.',
  },
  chooseRole: {
    title: 'Qaysi rolda kirasiz?',
    hint: 'Tanlovingiz eslab qolinadi. Keyin sozlamalarda almashtirishingiz mumkin.',
  },
  notLinked: {
    title: 'Akkaunt bogʻlanmagan',
    backToBot: 'Botga qaytish',
    staffHint:
      'Ustoz va xodimlar ham: botda «Start» → «📱 Telefon raqamni ulashish». Parol kerak emas.',
  },
  home: {
    greeting: 'Xush kelibsiz, {name}!',
    intro: 'Boʻlimlar shu yerda, pastki menyuda paydo boʻladi.',
  },
  settings: {
    title: 'Sozlamalar',
    role: 'Faol rol',
    current: 'Joriy',
  },
  tabs: {
    today: 'Bugun',
    groups: 'Guruhlarim',
    schedule: 'Jadval',
    profile: 'Profil',
  },
  ...teacherMessages,
  ...guardianMessages,
  ...staffMessages,
  ...staffWorkMessages,
  ...staffListMessages,
  ...staffOrgMessages,
  ...staffStudentMessages,
  ...auditActionMessages,
  ...studentMessages,
  ...introMessages,
  feedback: {
    title: 'Taklif yoki xato haqida',
    hint: 'Nima yaxshi ishlamayapti yoki nimani yaxshilash kerak? Biz har bir xabarni oʻqiymiz.',
    placeholder: 'Masalan: davomatni saqlashda tugma ishlamadi.',
    screenshot: 'Ekran rasmini qoʻshish',
    context: 'Avtomatik qoʻshiladi: ekran, rol, ilova versiyasi.',
    send: 'Yuborish',
    sent: 'Rahmat! Xabaringiz qabul qilindi.',
  },
  states: {
    loading: 'Yuklanmoqda…',
    retry: 'Qayta urinish',
    details: 'Batafsil',
    offline: 'Internet yoʻq',
    forbiddenTitle: 'Bu sahifa siz uchun emas',
    forbiddenAction: 'Bosh sahifaga',
  },
} as const;
