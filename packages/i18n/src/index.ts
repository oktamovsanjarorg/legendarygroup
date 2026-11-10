// i18n package - rasmiy oʻzbek lotin imlosi boʻyicha
export const I18N_DEFAULT_LOCALE = 'uz-Latn';

export const messages = {
  common: {
    appName: 'Legendary Group',
    loading: 'Yuklanmoqda...',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    error: 'Xatolik yuz berdi',
  },
} as const;

export type TranslationKey = keyof typeof messages;
