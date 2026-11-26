/**
 * Dizayn tokenlari (T-017b). Semantik nomlar — komponentlar faqat shularni ishlatadi
 * (`--lg-bg`, `--lg-text` ...), xom rang emas. Web ham, Mini App ham — shu palitra (Q-123):
 * Telegram'dan faqat yorug'/tungi rejim olinadi (Telegram Desktop tungi mavzusi — to'q ko'k, xira).
 */
export interface ColorTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  link: string;
  success: string;
  warning: string;
  danger: string;
  /** Holat belgilari foni (keldi/kelmadi/kech/sababli). */
  successBg: string;
  warningBg: string;
  dangerBg: string;
}

export type ColorScheme = 'light' | 'dark';

export const PALETTE: Record<ColorScheme, ColorTokens> = {
  light: {
    bg: '#ffffff',
    surface: '#f4f5f7',
    surfaceAlt: '#e9ebef',
    text: '#111827',
    textMuted: '#4b5563',
    border: '#d1d5db',
    primary: '#2563eb',
    primaryText: '#ffffff',
    link: '#2563eb',
    success: '#166534',
    warning: '#92400e',
    danger: '#b91c1c',
    successBg: '#dcfce7',
    warningBg: '#fef3c7',
    dangerBg: '#fee2e2',
  },
  dark: {
    // Neytral grafit (to'q ko'k emas, Q-123): kartochka — fondan ochroq.
    bg: '#1f2023',
    surface: '#141517',
    surfaceAlt: '#2a2c30',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    border: '#3a3c42',
    primary: '#60a5fa',
    primaryText: '#0b1220',
    link: '#7cb4fb',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    successBg: '#14361f',
    warningBg: '#3d2e0a',
    dangerBg: '#3f1515',
  },
};

/** Oraliq — 4 px qadam. */
export const SPACE = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const;

export const RADIUS = { sm: '6px', md: '10px', lg: '14px', full: '9999px' } as const;

/** 11-ux §3: Mini App — tizim shrifti, asosiy matn ≥ 16 px; web — Inter, ≥ 14 px. */
export const TYPOGRAPHY = {
  fontMiniApp:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontWeb: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  size: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '22px', '2xl': '28px' },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.25, normal: 1.5 },
  /**
   * Tugma yozuvi — WCAG "katta matn" (qalin ≥ 18.67 px): kontrast chegarasi 3:1. Shu tufayli
   * Telegram'ning standart tugma rangi (`#2481cc` + oq, 4.2:1) native ko'rinishda qoladi.
   */
  button: { size: '19px', weight: 700 },
  /** Raqam ustunlari (summa, ball) — 11-ux §3. */
  numeric: 'tabular-nums',
} as const;

export const SHADOW = {
  sm: '0 1px 2px rgb(0 0 0 / 0.08)',
  md: '0 4px 12px rgb(0 0 0 / 0.12)',
} as const;

/** 11-ux §3: minimal teginish maydoni. */
export const TOUCH_TARGET = '44px';
