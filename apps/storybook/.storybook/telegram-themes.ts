import type { TelegramThemeParams } from '@lg/ui-core';

/** Telegram standart temalari (namunaviy) + kontrasti past custom tema — fallback'ni ko'rish uchun. */
export interface TgTheme {
  scheme: 'light' | 'dark';
  params: TelegramThemeParams;
}

const LIGHT: TgTheme = {
  scheme: 'light',
  params: {
    bg_color: '#ffffff',
    secondary_bg_color: '#f1f1f4',
    text_color: '#000000',
    hint_color: '#707579',
    link_color: '#2481cc',
    button_color: '#2481cc',
    button_text_color: '#ffffff',
    destructive_text_color: '#d14e4e',
    section_separator_color: '#e7e7e7',
  },
};

export const TG_THEMES: Record<string, TgTheme> = {
  light: LIGHT,
  dark: {
    scheme: 'dark',
    params: {
      bg_color: '#212d3b',
      secondary_bg_color: '#151e27',
      text_color: '#ffffff',
      hint_color: '#7d8b99',
      link_color: '#5eabe1',
      button_color: '#5288c1',
      button_text_color: '#ffffff',
      destructive_text_color: '#ec3942',
      section_separator_color: '#0f1a24',
    },
  },
  lowContrast: {
    scheme: 'light',
    params: { bg_color: '#ffffff', text_color: '#dddddd', button_color: '#ffee00' },
  },
};

export const tgTheme = (name: string): TgTheme => TG_THEMES[name] ?? LIGHT;
