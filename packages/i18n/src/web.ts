import { webF1Messages } from './web-f1.js';
import { webF2Messages } from './web-f2.js';
import { webF3Messages } from './web-f3.js';
import { webHelpMessages } from './web-help.js';
import { permissionLabels } from './web-permissions.js';

/** Web panel matnlari (W-*, docs/ux/screens.md). */
export const webMessages = {
  ...webF1Messages,
  ...webF2Messages,
  ...webF3Messages,
  ...webHelpMessages,
  /** Ruxsat nomlari (02 §4) — W-28 override ro'yxati. */
  permissions: permissionLabels,
  appTitle: 'Legendary Group — boshqaruv paneli',
  login: {
    title: 'Boshqaruv paneliga kirish',
    hint: 'Telefon raqamingizni kiriting — Telegramda tasdiqlash tugmasi keladi. Parol kerak emas.',
    phone: 'Telefon raqam',
    viaTelegram: 'Telegram orqali kirish',
    waitingTitle: 'Telegramda tasdiqlang',
    telegramWaiting: 'Markaz botidagi xabarni oching va «Tasdiqlash» tugmasini bosing.',
    noMessage:
      'Xabar kelmadimi? Botni oching, «Start» bosing va telefon raqamingizni ulashing, soʻng shu yerda qayta urinib koʻring.',
    openBot: 'Botni ochish',
    telegramCancel: 'Orqaga',
  },
  handoff: {
    loading: 'Boshqaruv paneliga kirilmoqda…',
    missing: 'Kirish havolasi toʻliq emas. Mini Appʼda tugmani qayta bosing.',
    toLogin: 'Telefon raqam bilan kirish',
  },
  nav: {
    home: 'Bosh sahifa',
    sessions: 'Mening sessiyalarim',
    logout: 'Chiqish',
    role: 'Faol rol',
  },
  roles: {
    director: 'Direktor',
    admin: 'Admin',
    teacher: 'Ustoz',
    guardian: 'Ota-ona',
    student: 'Oʻquvchi',
  },
  home: {
    greeting: 'Xush kelibsiz, {name}!',
    intro: 'Boʻlimlar ruxsatlaringizga qarab chap menyuda koʻrinadi.',
  },
  telegramLink: {
    title: 'Telegramni ulash',
    hint: 'Panelga endi faqat Telegram orqali kiriladi. Hozir ulab qoʻying — aks holda chiqib ketsangiz, qayta kira olmaysiz.',
    open: 'Botni ochish va ulash',
    steps: 'Botda «Start» bosing va telefon raqamingizni ulashing.',
  },
  sessions: {
    title: 'Mening sessiyalarim',
    current: 'Joriy qurilma',
    revoke: 'Chiqish',
    revokeAll: 'Barcha qurilmalardan chiqish',
    confirmRevokeAll: 'Barcha qurilmalardan chiqasizmi? Shu qurilmada ham qayta kirasiz.',
    empty: 'Faol sessiya yoʻq.',
    unknownDevice: 'Nomaʼlum qurilma',
  },
  states: {
    loading: 'Yuklanmoqda…',
    retry: 'Qayta urinish',
    details: 'Batafsil',
    offline: 'Internet yoʻq. Maʼlumotlar yangilanmasligi mumkin.',
    forbiddenTitle: 'Bu sahifa siz uchun emas',
    forbiddenAction: 'Bosh sahifaga',
    notFound: 'Sahifa topilmadi',
    crashed: 'Sahifani koʻrsatishda xatolik yuz berdi. Qayta urinib koʻring.',
  },
} as const;
