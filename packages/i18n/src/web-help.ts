import { helpSectionsOps } from './web-help-sections-ops.js';
import { type HelpItem, type HelpSection, helpSectionsOrg } from './web-help-sections-org.js';

export type { HelpItem, HelpSection };

export const helpSections: readonly HelpSection[] = [...helpSectionsOrg, ...helpSectionsOps];

export const webHelpMessages = {
  help: {
    title: 'Yordam',
    description: 'Boshqaruv paneli boʻyicha qoʻllanma va tez-tez beriladigan savollar.',
    searchPlaceholder: 'Savol yoki kalit soʻz boʻyicha qidirish…',
    clearSearch: 'Tozalash',
    allSections: 'Barcha boʻlimlar',
    open: 'Yordamni ochish',
    emptyTitle: 'Hech narsa topilmadi',
    emptyHint: 'Boshqa kalit soʻz kiritib koʻring yoki boʻlim filtrini almashtiring.',
    stepsTitle: 'Qadamlar:',
    noteTitle: 'Eslatma:',
    sections: helpSections,
    replayTour: 'Tanishtiruvni qayta koʻrish',
  },
  /** T-124: birinchi kirishda menyu boʻylab tanishtiruv; `to` — menyu bandi (`nav.ts`). */
  tour: {
    counter: '{i} / {n}',
    skip: 'Oʻtkazib yuborish',
    back: 'Orqaga',
    next: 'Keyingisi',
    done: 'Tushunarli',
    steps: [
      {
        to: '/',
        title: 'Bosh sahifa',
        body: 'Markazning bugungi va oylik holati: tushum, qarzlar, davomat, chek navbati. Har kuni shu yerdan boshlang.',
      },
      {
        to: '/students',
        title: 'Oʻquvchilar',
        body: 'Yangi oʻquvchi qoʻshish, guruhga yozish, ota-onani ulash. Oʻquvchi kartasida toʻlovlar, davomat va chegirma.',
      },
      {
        to: '/groups',
        title: 'Guruhlar',
        body: 'Guruh ochish, ustoz biriktirish, dars jadvalini oʻzgartirish. Xona band boʻlsa, tizim ogohlantiradi.',
      },
      {
        to: '/payments/new',
        title: 'Toʻlov kiritish',
        body: 'Naqd yoki karta toʻlovi — chek darhol chiqadi. Istalgan sahifadan tezkor: Alt+P.',
      },
      {
        to: '/payments/queue',
        title: 'Chek navbati',
        body: 'Ota-onalar karta orqali toʻlab, chek rasmini botga yuboradi — shu yerda tasdiqlaysiz yoki rad etasiz.',
      },
      {
        to: '/approvals',
        title: 'Tasdiqlash soʻrovlari',
        body: 'Admin chegirma, storno yoki pul qaytarishni soʻrasa — shu yerda (va botda) tasdiqlaysiz.',
      },
      {
        to: '/staff',
        title: 'Xodimlar',
        body: 'Admin va ustoz qoʻshish (ular botda raqamini ulashib kiradi), rol berish, ishdan ketganni bloklash.',
      },
      {
        to: '/help',
        title: 'Yordam',
        body: '«Qanday qilaman?» savollari va qadamlar. Har sahifa sarlavhasi yonidagi «?» ham shu yerga olib keladi. Tanishtiruvni shu yerdan qayta koʻrasiz.',
      },
    ],
  },
} as const;
