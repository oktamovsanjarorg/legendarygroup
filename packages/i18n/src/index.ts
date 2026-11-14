// i18n package - rasmiy oʻzbek lotin imlosi boʻyicha
import { botMessages } from './bot.js';
import { errorMessages } from './errors.js';
import { miniappMessages } from './miniapp.js';
import { webMessages } from './web.js';

export * from './bot.js';
export * from './errors.js';
export * from './format.js';
export * from './miniapp.js';
export * from './normalize.js';
export * from './notifications.js';
export * from './web.js';
export * from './words.js';

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
  web: webMessages,
  miniapp: miniappMessages,
} as const;
