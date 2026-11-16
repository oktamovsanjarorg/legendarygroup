import type { HelpSection } from './web-help-sections-org.js';

export const helpSectionsOps: readonly HelpSection[] = [
  {
    id: 'sorovlar',
    title: 'Tasdiqlash soʻrovlari',
    permission: 'approval.decide',
    items: [
      {
        id: 'tasdiqlash-sorovlari',
        q: 'Admin soʻrovlarini qanday tasdiqlayman?',
        steps: [
          'Adminʼning chegirma, storno, qaytarish yoki davomat soʻrovlari botda va «Tasdiqlash soʻrovlari» boʻlimida koʻrinadi.',
          '«Tasdiqlash» yoki «Rad etish»ni bosing.',
        ],
        note: '48 soat javobsiz qolsa soʻrov oʻzi bekor boʻladi.',
      },
    ],
  },
  {
    id: 'oylik',
    title: 'Ustozlar oyligi',
    permission: 'payroll.manage',
    items: [
      {
        id: 'oylik-hisoblash',
        q: 'Oʻqituvchilar (ustozlar) oyligi qanday hisoblanadi va toʻlanadi?',
        steps: [
          'Menyu → «Oyliklar hisobi» → hisob oyini tanlang → «Hisoblash».',
          'Har ustoz qatori → «Tafsilot»: bonus, jarima yoki «Avans berish».',
          'Tekshirgach «Tasdiqlash» (faqat Direktor). Tasdiqlangan hisob qayta hisoblanmaydi.',
          'Pul berilgach «Toʻlandi deb belgilash».',
        ],
        note: 'Shartnomasiz ustozga oylik hisoblanmaydi.',
      },
    ],
  },
  {
    id: 'hisobotlar',
    title: 'Hisobotlar va nazorat',
    permission: 'stats.operational',
    items: [
      {
        id: 'hisobot-turlari',
        q: 'Qaysi hisobotni qayerdan topaman?',
        steps: [
          'Bugungi tushum va davomat: Mini App → «Bugun».',
          'Oylik koʻrsatkichlar: Web → «Bosh sahifa».',
          'Foyda va zarar: «Foyda va zararlar (P&L)».',
          'Xarajat kiritish: «Xarajatlar» → «Xarajat qoʻshish».',
          'Davomat va ustozlar tahlili: «Tahlil va hisobotlar».',
          'Xavf ostidagi oʻquvchilar: «Prognozlar».',
          'Amallar tarixi: «Audit».',
        ],
      },
    ],
  },
  {
    id: 'xabarlar',
    title: 'Xabarlar',
    permission: 'announcement.send',
    items: [
      {
        id: 'elon-va-murojaatlar',
        q: 'Eʼlon va xabarlar qanday yuboriladi?',
        steps: [
          'Ommaviy eʼlon: «Eʼlonlar» → «Yangi eʼlon» → «Yuborish».',
          'Ota-ona murojaatlari: «Murojaatlar» → javob yozing → «Javob yuborish».',
          'Yetib bormagan xabarlar: «Yetib bormagan xabarlar» → «Qayta yuborish».',
        ],
      },
    ],
  },
  {
    id: 'sozlamalar',
    title: 'Sozlamalar',
    permission: 'settings.manage',
    items: [
      {
        id: 'sozlamalar-turlari',
        q: 'Markaz sozlamalarini qanday oʻzgartiraman?',
        steps: [
          'Markaz: nom, telefon, manzil.',
          'Toʻlov: karta raqami, toʻlov muddati, Admin chegirma limiti.',
          'Davomat: kech qolish chegarasi, ustozga eslatma vaqti.',
          'Bayramlar: dam olish kunlari roʻyxati.',
        ],
      },
    ],
  },
];
