import { describe, expect, it } from 'vitest';
import { AA_TEXT, AA_UI, contrastRatio, parseHex } from './contrast.js';
import { toCssVariables } from './css.js';
import { PALETTE } from './palette.js';
import { resolveTelegramTheme } from './telegram-theme.js';

describe('contrastRatio (WCAG)', () => {
  it("ma'lum qiymatlar", () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(parseHex('#abc')).toEqual([170, 187, 204]);
    expect(contrastRatio('not-a-color', '#fff')).toBe(1);
  });
});

describe('Palitra — WCAG AA (light va dark)', () => {
  const textPairs = [
    ['text', 'bg'],
    ['text', 'surface'],
    ['text', 'surfaceAlt'],
    ['textMuted', 'bg'],
    ['textMuted', 'surface'],
    ['primaryText', 'primary'],
    ['success', 'successBg'],
    ['warning', 'warningBg'],
    ['danger', 'dangerBg'],
    ['link', 'bg'],
    ['danger', 'bg'],
    ['success', 'bg'],
  ] as const;

  it.each(['light', 'dark'] as const)('%s: matn juftlari ≥ 4.5', (scheme) => {
    const p = PALETTE[scheme];
    const failing = textPairs.filter(([fg, bg]) => contrastRatio(p[fg], p[bg]) < AA_TEXT);
    expect(failing).toEqual([]);
  });

  it.each(['light', 'dark'] as const)(
    "%s: chegara/fon ≥ 1.3 (ko'rinadi), tugma/fon ≥ 3",
    (scheme) => {
      const p = PALETTE[scheme];
      expect(contrastRatio(p.primary, p.bg)).toBeGreaterThanOrEqual(AA_UI);
      expect(contrastRatio(p.border, p.bg)).toBeGreaterThanOrEqual(1.3);
    },
  );
});

describe('resolveTelegramTheme (11-ux §3)', () => {
  it('yaxshi kontrastli Telegram temasi — saqlanadi', () => {
    const r = resolveTelegramTheme(
      {
        bg_color: '#ffffff',
        text_color: '#000000',
        button_color: '#2481cc',
        button_text_color: '#ffffff',
        hint_color: '#707579',
        link_color: '#2481cc',
      },
      'light',
    );
    expect(r.fallbacks).toEqual([]);
    expect(r.tokens.primary).toBe('#2481cc');
  });

  it("past kontrastli custom tema — o'sha juft xavfsiz palitraga qaytadi", () => {
    const r = resolveTelegramTheme(
      {
        bg_color: '#333333',
        text_color: '#444444',
        button_color: '#2481cc',
        button_text_color: '#ffffff',
      },
      'dark',
    );
    expect(r.fallbacks).toContain('text/bg');
    expect(contrastRatio(r.tokens.text, r.tokens.bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("bo'sh yoki noto'g'ri qiymatlar — palitra", () => {
    const r = resolveTelegramTheme({ bg_color: 'red', text_color: undefined }, 'light');
    expect(r.tokens.bg).toBe(PALETTE.light.bg);
    expect(r.tokens.text).toBe(PALETTE.light.text);
  });
});

describe('toCssVariables', () => {
  it('semantik nomlar kebab-case', () => {
    const css = toCssVariables(PALETTE.light);
    expect(css).toContain('--lg-text-muted: #4b5563;');
    expect(css).toContain('--lg-primary-text: #ffffff;');
  });
});
