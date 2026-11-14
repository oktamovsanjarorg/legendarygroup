import { PALETTE } from '@lg/ui-core';
import { describe, expect, it } from 'vitest';
import { createFakeWebApp } from './testing.js';
import { applyTelegramTheme, safeAreaCss } from './theme.js';

const css = () => document.getElementById('lg-theme')?.textContent ?? '';

describe('applyTelegramTheme (11-ux §3)', () => {
  it('foydalanuvchi temasi tokenlarga; sarlavha/fon/pastki panel sahifa foniga', () => {
    const wa = createFakeWebApp({
      colorScheme: 'dark',
      themeParams: { bg_color: '#17212b', secondary_bg_color: '#232e3c', text_color: '#ffffff' },
    });
    const off = applyTelegramTheme(wa);
    expect(css()).toContain('--lg-bg: #17212b;');
    expect(css()).toContain('color-scheme:dark');
    expect(wa.colors).toEqual({ header: '#232e3c', background: '#232e3c', bottomBar: '#232e3c' });
    off();
    expect(document.getElementById('lg-theme')).toBeNull();
  });

  it("kontrast past custom tema — o'sha juft xavfsiz palitradan", () => {
    const wa = createFakeWebApp({ themeParams: { bg_color: '#ffffff', text_color: '#eeeeee' } });
    const off = applyTelegramTheme(wa);
    expect(css()).toContain(`--lg-text: ${PALETTE.light.text};`);
    off();
  });

  it("themeChanged — qayta qo'llanadi; bekor qilingach — tinglamaydi", () => {
    const wa = createFakeWebApp({ themeParams: { bg_color: '#ffffff' } });
    const off = applyTelegramTheme(wa);
    wa.themeParams = { bg_color: '#fafafa' };
    wa.emit('themeChanged');
    expect(css()).toContain('--lg-bg: #fafafa;');
    off();
    wa.themeParams = { bg_color: '#f0f0f0' };
    wa.emit('themeChanged');
    expect(css()).not.toContain('#f0f0f0');
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
