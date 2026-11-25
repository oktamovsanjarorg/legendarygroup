import type { HelpSection } from './web-help-sections-org.js';

/** Mini App — xodim: yordam (MS-34, T-163). Yo'llar — «Koʻproq» menyusi nomlari bilan bir xil. */
const helpSections: readonly HelpSection[] = [
  {
    id: 'kirish',
    title: 'Kirish',
    items: [
      {
        id: 'kirish',
        q: 'Tizimga qanday kiraman?',
        steps: [
          'Markaz botini oching → «Start» → «📱 Telefon raqamni ulashish».',
          'Raqamingiz «Xodimlar»dagi raqam bilan bir xil boʻlsa — darhol ulanadi. Parol yoʻq.',
          'Keyin bot menyu tugmasi bilan ilovani ochasiz.',
        ],
      },
      {
        id: 'kirish-muammo',
        q: 'Kira olmayapman — nima qilay?',
        steps: [
          'Bot raqamni tanimasa: Direktor «Xodimlar» → xodim → «Ism va raqamni tuzatish»da raqamni tekshirsin.',
          'Bot «boshqa profilga ulangan» desa: Direktor xodim kartasida «Telegramni uzish»ni bossin, soʻng raqamni qayta ulashing.',
        ],
      },
      {
        id: 'rol',
        q: 'Boshqa rolga qanday oʻtaman?',
        steps: ['Ilova yuqorisidagi ⋮ → «Sozlamalar» → rolni tanlang.'],
      },
    ],
  },
  {
    id: 'oquvchilar',
    title: 'Oʻquvchilar',
    permission: 'student.manage',
    items: [
      {
        id: 'oquvchi-qoshish',
        q: 'Yangi oʻquvchini qanday qoʻshaman?',
        steps: [
          '«Koʻproq» → «Yangi oʻquvchi»: ism, ota-ona raqami, guruh va boshlash kuni.',
          'Oy oʻrtasida boshlasa, birinchi oy summasi qolgan darslarga qarab hisoblanadi — saqlashdan oldin koʻrinadi.',
        ],
      },
      {
        id: 'ota-ona',
        q: 'Ota-onani botga qanday ulayman?',
        steps: [
          'Oʻquvchi kartasi → ota-ona raqamini kiriting.',
          'Ota-ona botda «Start» bosib shu raqamni ulashsa, oʻzi bogʻlanadi.',
        ],
        note: 'Raqam mos kelmasa, soʻrov «Bogʻlanish soʻrovlari»ga tushadi.',
      },
      {
        id: 'guruh-harakati',
        q: 'Koʻchirish, muzlatish, guruhdan chiqarish qanday?',
        steps: [
          'Oʻquvchi kartasi → guruhi → kerakli amal.',
          'Muzlatish — kamida 14 kun; shu davr darslari hisobdan ayriladi.',
        ],
      },
      {
        id: 'lid',
        permission: 'lead.manage',
        q: 'Lidlar bilan qanday ishlayman?',
        steps: ['«Koʻproq» → «Lidlar»: qoʻshish, holatini almashtirish, yozilsa — guruhga yozish.'],
      },
    ],
  },
  {
    id: 'pul',
    title: 'Pul',
    items: [
      {
        id: 'tolov',
        permission: 'payment.create',
        q: 'Naqd yoki terminal toʻlovini qanday kiritaman?',
        steps: [
          '«Koʻproq» → «Toʻlov kiritish» → oʻquvchi, summa, usul.',
          'Chek ota-onaga botdan boradi (botga ulangan boʻlsa).',
        ],
      },
      {
        id: 'chek',
        permission: 'payment.review',
        q: 'Ota-ona yuborgan chekni qanday tekshiraman?',
        steps: [
          '«Koʻproq» → «Chek navbati»: rasm va summani bank ilovasi bilan solishtiring.',
          '«Tasdiqlash» yoki sabab bilan rad etish — ota-onaga natija boradi.',
        ],
      },
      {
        id: 'qarz',
        permission: 'payment.review',
        q: 'Qarzdorlarga qanday eslataman?',
        steps: [
          '«Koʻproq» → «Qarzdorlar» → oʻquvchi → «Eslatma yuborish».',
          'Muddatdan 3 kun oldin, oʻsha kuni, 3 va 7 kundan keyin eslatma oʻzi ketadi.',
        ],
      },
      {
        id: 'chegirma',
        permission: 'discount.grant',
        q: 'Chegirma qanday beriladi?',
        steps: ['«Koʻproq» → «Chegirmalar» yoki oʻquvchi kartasi.'],
        note: 'Admin limitidan katta chegirma Direktor tasdigʻiga ketadi.',
      },
      {
        id: 'storno',
        permission: 'payment.reverse',
        q: 'Xato toʻlovni qanday bekor qilaman?',
        steps: ['«Koʻproq» → «Toʻlovlar tarixi» → toʻlov → bekor qilish yoki qaytarish.'],
        note: 'Admin oʻsha kuni oʻzi bekor qiladi; keyin va pul qaytarishda Direktor tasdigʻi kerak.',
      },
      {
        id: 'kassa',
        permission: 'cash.close',
        q: 'Kassani qanday yopaman?',
        steps: ['«Koʻproq» → «Kassa» → sanalgan naqdni kiriting; farq boʻlsa — sababini yozing.'],
      },
    ],
  },
  {
    id: 'darslar',
    title: 'Darslar',
    permission: 'group.manage',
    items: [
      {
        id: 'guruh',
        q: 'Guruh qanday ochiladi?',
        steps: [
          'Avval «Kurslar» va «Xonalar»ni kiriting.',
          '«Koʻproq» → «Guruhlar» → yangi guruh: kurs, xona, jadval, ustoz.',
        ],
        note: 'Xona yoki ustoz band boʻlsa, ilova ogohlantiradi.',
      },
      {
        id: 'dars',
        q: 'Darsni koʻchirish yoki bekor qilish qanday?',
        steps: ['«Koʻproq» → «Darslar kalendari» → dars → koʻchirish, bekor qilish, oʻrinbosar.'],
        note: 'Bekor qilingan dars puli keyingi oy hisobidan ayriladi; oʻrniga dars qoʻyilsa — ayrilmaydi.',
      },
      {
        id: 'davomat',
        permission: 'attendance.edit_past',
        q: 'Oʻtgan kun davomatini qanday tuzataman?',
        steps: [
          '«Koʻproq» → «Davomat nazorati» → guruh → dars → belgini sabab bilan oʻzgartiring.',
        ],
      },
    ],
  },
  {
    id: 'aloqa',
    title: 'Aloqa',
    permission: 'announcement.send',
    items: [
      {
        id: 'elon',
        q: 'Eʼlon va murojaatlar qayerda?',
        steps: [
          '«Eʼlonlar» — yangi eʼlon; «Murojaatlar» — ota-onaga javob.',
          '«Yetib bormagan xabarlar» — kimga xabar bormagani va sababi.',
        ],
      },
    ],
  },
  {
    id: 'boshqaruv',
    title: 'Boshqaruv',
    items: [
      {
        id: 'xodim',
        permission: 'staff.manage',
        q: 'Xodim qanday qoʻshiladi yoki bloklanadi?',
        steps: [
          '«Koʻproq» → «Xodimlar» → «Xodim qoʻshish»: ism, Telegram raqami, rol.',
          'Ketsa — kartasida «Bloklash»: darhol chiqariladi.',
        ],
      },
      {
        id: 'sorov',
        permission: 'approval.decide',
        q: 'Admin soʻrovlarini qanday tasdiqlayman?',
        steps: ['Botdagi xabardan yoki «Koʻproq» → «Tasdiqlash soʻrovlari»dan.'],
        note: '48 soat javobsiz qolsa, soʻrov oʻzi bekor boʻladi.',
      },
      {
        id: 'oylik',
        permission: 'payroll.manage',
        q: 'Ustozlar oyligi qanday hisoblanadi?',
        steps: [
          '«Koʻproq» → «Oyliklar»: avval har ustozga shartnoma kiriting.',
          'Oy tugagach «Hisoblash» → tekshirish, bonus yoki jarima → tasdiqlash → toʻlandi.',
        ],
        note: 'Avans keyingi oylikdan oʻzi ushlanadi.',
      },
      {
        id: 'moliya',
        permission: 'finance.view',
        q: 'Foyda, hisobot va prognoz qayerda?',
        steps: [
          '«Moliya» — foyda va zarar; «Xarajat qoʻshish» — xarajat.',
          '«Hisobotlar» — Excel yoki PDF fayl bot chatingizga keladi.',
          '«Prognozlar» — kutilayotgan tushum va ketish xavfi bor oʻquvchilar.',
        ],
      },
      {
        id: 'sozlama',
        permission: 'settings.manage',
        q: 'Markaz sozlamalarini qanday oʻzgartiraman?',
        steps: ['«Koʻproq» → «Sozlamalar»: markaz, kartalar, toʻlov muddati, jarima, vaqtlar.'],
      },
    ],
  },
];

export const staffHelpMessages = {
  staffHelp: {
    title: 'Yordam',
    search: 'Savol yoki soʻz boʻyicha qidirish',
    clear: 'Tozalash',
    empty: 'Hech narsa topilmadi.',
    sections: helpSections,
  },
  staffSessions: {
    title: 'Kompyuterdagi kirishlar',
    hint: 'Brauzerda ochilgan panel. Tanimagan qurilma boʻlsa — chiqaring.',
    empty: 'Brauzerda ochiq kirish yoʻq.',
    unknown: 'Nomaʼlum qurilma',
    end: 'Chiqarish',
    endTitle: 'Bu qurilmadan chiqarilsinmi?',
    endAll: 'Hammasidan chiqish',
    endAllTitle: 'Barcha brauzerlardan chiqilsinmi?',
  },
} as const;
