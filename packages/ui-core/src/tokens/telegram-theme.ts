import { AA_TEXT, AA_UI, contrastRatio, parseHex } from './contrast.js';
import { type ColorScheme, type ColorTokens, PALETTE } from './palette.js';

/** Telegram `WebApp.themeParams` (core.telegram.org/bots/webapps#themeparams) — kerakli qismi. */
export interface TelegramThemeParams {
  bg_color?: string;
  secondary_bg_color?: string;
  section_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  subtitle_text_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  destructive_text_color?: string;
  section_separator_color?: string;
}

export interface ResolvedTheme {
  tokens: ColorTokens;
  /** Kontrast yetmagani uchun xavfsiz palitraga qaytilgan juftlar. */
  fallbacks: string[];
}

const pick = (value: string | undefined, fallback: string): string =>
  value && parseHex(value) ? value : fallback;

/**
 * `themeParams` → semantik tokenlar (11-ux §3). Har muhim juft WCAG AA bo'yicha tekshiriladi:
 * matn/fon ≥ 4.5; tugma yozuvi (katta, qalin), havola va belgilar ≥ 3. Yetmasa — o'sha juft xavfsiz palitradan olinadi
 * (butun temani almashtirmasdan — foydalanuvchi temasi imkon qadar saqlanadi).
 */
export function resolveTelegramTheme(
  params: TelegramThemeParams,
  scheme: ColorScheme,
): ResolvedTheme {
  const safe = PALETTE[scheme];
  const t: ColorTokens = {
    ...safe,
    bg: pick(params.bg_color, safe.bg),
    surface: pick(params.secondary_bg_color ?? params.section_bg_color, safe.surface),
    text: pick(params.text_color, safe.text),
    textMuted: pick(params.hint_color ?? params.subtitle_text_color, safe.textMuted),
    link: pick(params.link_color, safe.link),
    primary: pick(params.button_color, safe.primary),
    primaryText: pick(params.button_text_color, safe.primaryText),
    danger: pick(params.destructive_text_color, safe.danger),
    border: pick(params.section_separator_color, safe.border),
  };
  const fallbacks: string[] = [];
  const ensure = (fg: keyof ColorTokens, bg: keyof ColorTokens, min: number) => {
    if (contrastRatio(t[fg], t[bg]) >= min) return;
    fallbacks.push(`${fg}/${bg}`);
    t[fg] = safe[fg];
    t[bg] = safe[bg];
  };
  ensure('text', 'bg', AA_TEXT);
  ensure('text', 'surface', AA_TEXT);
  ensure('primaryText', 'primary', AA_UI); // tugma yozuvi — katta matn (TYPOGRAPHY.button)
  ensure('textMuted', 'bg', AA_UI);
  ensure('link', 'bg', AA_UI);
  ensure('danger', 'bg', AA_UI);
  return { tokens: t, fallbacks };
}
