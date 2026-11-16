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
  },
} as const;
