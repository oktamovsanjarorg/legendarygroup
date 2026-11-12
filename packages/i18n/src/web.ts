import { webF1Messages } from './web-f1.js';
import { webF2Messages } from './web-f2.js';

/** Web panel matnlari (W-*, docs/ux/screens.md). */
export const webMessages = {
  ...webF1Messages,
  ...webF2Messages,
  appTitle: 'Legendary Group — boshqaruv paneli',
  login: {
    title: 'Tizimga kirish',
    phone: 'Telefon raqam',
    password: 'Parol',
    submit: 'Kirish',
    viaTelegram: 'Telegram orqali kirish',
    telegramWaiting: 'Telegramdagi xabarni oching va «Tasdiqlash» tugmasini bosing.',
    telegramCancel: 'Bekor qilish',
  },
  totp: {
    setupTitle: 'Ikki bosqichli himoyani yoqing',
    setupHint:
      'Google Authenticator yoki shunga oʻxshash ilovada QR kodni skanerlang, soʻng 6 xonali kodni kiriting.',
    secretLabel: 'Qoʻlda kiritish uchun kalit',
    verifyTitle: 'Tasdiqlash kodi',
    verifyHint: 'Autentifikator ilovasidagi 6 xonali kodni kiriting.',
    code: 'Kod',
    useBackup: 'Zaxira kod bilan kirish',
    backupCode: 'Zaxira kod',
    submit: 'Tasdiqlash',
    backupTitle: 'Zaxira kodlarni saqlang',
    backupHint:
      'Telefoningiz yoʻqolsa, shu kodlar bilan kirasiz. Har biri bir marta ishlaydi. Ular boshqa koʻrsatilmaydi.',
    backupDone: 'Saqladim, davom etish',
  },
  invite: {
    title: 'Parol oʻrnating',
    hint: 'Kamida 10 belgi. Uzun va eslab qolinadigan iborani tanlang.',
    password: 'Yangi parol',
    confirm: 'Parolni takrorlang',
    mismatch: 'Parollar mos emas.',
    submit: 'Davom etish',
  },
  nav: {
    home: 'Bosh sahifa',
    sessions: 'Mening sessiyalarim',
    logout: 'Chiqish',
    role: 'Faol rol',
  },
  roles: { director: 'Direktor', admin: 'Admin', teacher: 'Ustoz', guardian: 'Ota-ona' },
  home: {
    greeting: 'Xush kelibsiz, {name}!',
    intro: 'Boʻlimlar ruxsatlaringizga qarab chap menyuda koʻrinadi.',
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
  },
} as const;
