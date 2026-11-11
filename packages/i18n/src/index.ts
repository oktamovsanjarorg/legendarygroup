// i18n package - rasmiy oʻzbek lotin imlosi boʻyicha
import { botMessages } from './bot.js';
import { errorMessages } from './errors.js';

export * from './bot.js';
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
  bot: botMessages,
} as const;
