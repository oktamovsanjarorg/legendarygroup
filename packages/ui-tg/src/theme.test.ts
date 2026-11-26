import { PALETTE } from '@lg/ui-core';
import { describe, expect, it } from 'vitest';
import { createFakeWebApp } from './testing.js';
import { applyTelegramTheme, safeAreaCss } from './theme.js';

const css = () => document.getElementById('lg-theme')?.textContent ?? '';

describe('applyTelegramTheme (11-ux §3, Q-123)', () => {
  it('Telegram ranglari emas — oʻz palitramiz; faqat rejim (tungi) olinadi', () => {
    const wa = createFakeWebApp({
      colorScheme: 'dark',
      themeParams: { bg_color: '#17212b', secondary_bg_color: '#232e3c', text_color: '#ffffff' },
    });
    const off = applyTelegramTheme(wa);
    expect(css()).toContain(`--lg-bg: ${PALETTE.dark.bg};`);
    expect(css()).not.toContain('#17212b');
    expect(css()).toContain('color-scheme:dark');
    const s = PALETTE.dark.surface;
    expect(wa.colors).toEqual({ header: s, background: s, bottomBar: s });
    off();
    expect(document.getElementById('lg-theme')).toBeNull();
  });

  it("themeChanged (rejim almashdi) — qayta qo'llanadi; bekor qilingach — tinglamaydi", () => {
    const wa = createFakeWebApp({ colorScheme: 'light' });
    const off = applyTelegramTheme(wa);
    expect(css()).toContain(`--lg-bg: ${PALETTE.light.bg};`);
    wa.colorScheme = 'dark';
    wa.emit('themeChanged');
    expect(css()).toContain(`--lg-bg: ${PALETTE.dark.bg};`);
    off();
    wa.colorScheme = 'light';
    wa.emit('themeChanged');
    expect(document.getElementById('lg-theme')).toBeNull();
  });

  it('eski klient (6.0): rang metodlari chaqirilmaydi', () => {
    const wa = createFakeWebApp({ version: '6.0' });
    const off = applyTelegramTheme(wa);
    expect(wa.colors).toEqual({});
    off();
  });
});

describe('safeAreaCss', () => {
  it("qurilma + Telegram boshqaruvlari zonasi qo'shiladi", () => {
    const wa = createFakeWebApp({
      safeAreaInset: { top: 44, bottom: 34, left: 0, right: 0 },
      contentSafeAreaInset: { top: 56, bottom: 0, left: 0, right: 0 },
    });
    expect(safeAreaCss(wa)).toContain('--lg-safe-top: 100px;');
    expect(safeAreaCss(wa)).toContain('--lg-safe-bottom: 34px;');
  });

  it('8.0 dan eski — nol', () => {
    const wa = createFakeWebApp({
      version: '7.10',
      safeAreaInset: { top: 44, bottom: 34, left: 0, right: 0 },
    });
    expect(safeAreaCss(wa)).toContain('--lg-safe-top: 0px;');
  });
});
