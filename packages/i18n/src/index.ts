// i18n package - rasmiy oʻzbek lotin imlosi boʻyicha
import { errorMessages } from './errors.js';

export * from './errors.js';

export const I18N_DEFAULT_LOCALE = 'uz-Latn';

export const messages = {
  common: {
    appName: 'Legendary Group',
    loading: 'Yuklanmoqda…',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    error: 'Xatolik yuz berdi',
  },
  errors: errorMessages,
} as const;
