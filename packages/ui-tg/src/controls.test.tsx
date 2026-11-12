import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  type BottomButtonOptions,
  haptic,
  useBackButton,
  useClosingConfirmation,
  useMainButton,
  useSecondaryButton,
  useSettingsButton,
} from './controls.js';
import { TelegramProvider } from './provider.js';
import { createFakeWebApp, type FakeWebApp } from './testing.js';

const wrap = (wa: FakeWebApp, ui: ReactNode) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);

function Main(props: BottomButtonOptions) {
  useMainButton(props);
  return null;
}

describe('useMainButton (11-ux §4.1)', () => {
  it('matn, faollik; bosish — oxirgi callback; unmount — yashirinadi', () => {
    const wa = createFakeWebApp();
    const first = vi.fn();
    const second = vi.fn();
    const r = wrap(wa, <Main text="Saqlash (18/20)" onClick={first} />);
    expect(wa.MainButton.params).toMatchObject({
      text: 'Saqlash (18/20)',
      is_active: true,
      is_visible: true,
    });
    r.rerender(
      <TelegramProvider webApp={wa}>
        <Main text="Saqlash (18/20)" onClick={second} />
      </TelegramProvider>,
    );
    act(() => wa.MainButton.click());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    r.unmount();
    expect(wa.MainButton.params.is_visible).toBe(false);
    act(() => wa.MainButton.click());
    expect(second).toHaveBeenCalledOnce();
  });

  it('loading — progress, bosish e’tiborsiz; disabled — faol emas', () => {
    const wa = createFakeWebApp();
    const onClick = vi.fn();
    const r = wrap(wa, <Main text="Yuborish" onClick={onClick} loading />);
    expect(wa.MainButton.progress).toBe(true);
    act(() => wa.MainButton.click());
    expect(onClick).not.toHaveBeenCalled();
    r.rerender(
      <TelegramProvider webApp={wa}>
        <Main text="Yuborish" onClick={onClick} disabled />
      </TelegramProvider>,
    );
    expect(wa.MainButton.progress).toBe(false);
    expect(wa.MainButton.params.is_active).toBe(false);
  });
});

function Others({
  back,
  settings,
  dirty,
}: {
  back?: () => void;
  settings?: () => void;
  dirty: boolean;
}) {
  useBackButton(back ?? null);
  useSettingsButton(settings ?? null);
  useClosingConfirmation(dirty);
  useSecondaryButton({ text: 'Rad etish', onClick: () => undefined });
  return null;
}

describe('BackButton, SettingsButton, closing confirmation, SecondaryButton', () => {
  it("callback bor — ko'rinadi va ishlaydi; yo'q — yashirin", () => {
    const wa = createFakeWebApp();
    const back = vi.fn();
    const r = wrap(wa, <Others back={back} settings={() => undefined} dirty />);
    expect(wa.BackButton.visible).toBe(true);
    expect(wa.SettingsButton.visible).toBe(true);
    expect(wa.closingConfirmation).toBe(true);
    expect(wa.SecondaryButton.params.is_visible).toBe(true);
    act(() => wa.BackButton.click());
    expect(back).toHaveBeenCalledOnce();
    r.rerender(
      <TelegramProvider webApp={wa}>
        <Others dirty={false} />
      </TelegramProvider>,
    );
    expect(wa.BackButton.visible).toBe(false);
    expect(wa.closingConfirmation).toBe(false);
  });

  it('eski klient (7.0): SecondaryButton ishlatilmaydi', () => {
    const wa = createFakeWebApp({ version: '7.0' });
    wrap(wa, <Others dirty={false} />);
    expect(wa.SecondaryButton.params.is_visible).toBe(false);
  });
});

describe('haptic (11-ux §4.2)', () => {
  it('success/error/selection; 6.0 — jim', () => {
    const wa = createFakeWebApp();
    const h = haptic(wa);
    h.success();
    h.error();
    h.selection();
    expect(wa.haptics).toEqual(['success', 'error', 'selection']);
    const old = createFakeWebApp({ version: '6.0' });
    haptic(old).success();
    expect(old.haptics).toEqual([]);
  });
});
