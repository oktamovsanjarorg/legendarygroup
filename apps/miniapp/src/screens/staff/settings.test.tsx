import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cardValid,
  centerFilled,
  emptyCard,
  sectionPatch,
  toForm,
  withCard,
  withoutCard,
  withPrimary,
} from '../../data/staff-settings.js';
import { CardView, SettingsSectionView, StartView } from './settings.js';
import { cards, settings, start } from './settings-mock.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const noop = () => undefined;
const f = toForm(settings);
const card = { cardNumber: '8600 5555 6666 7777', holderName: 'LG', bankName: 'Bank' };

describe('MS-32 boʻlim PATCH (T-161)', () => {
  it('har boʻlim faqat oʻz maydonlarini yuboradi', () => {
    expect(sectionPatch('billing', { ...f, dueDay: '5', discount: '15' })).toEqual({
      billingDueDay: 5,
      adminDiscountLimitPercent: 15,
    });
    expect(sectionPatch('times', f)).toEqual({
      notificationTimes: {
        morningReminderTime: '09:00',
        eveningDigestTime: '21:00',
        attendanceReminderMinutes: 30,
      },
      absenceNoticeWindowMinutes: 3,
    });
    expect(sectionPatch('center', f, 'logo-1')).toMatchObject({
      centerInfo: { logoFileId: 'logo-1' },
    });
  });

  it('chegaradan tashqari qiymat — saqlanmaydi (BR-2: 1–28)', () => {
    for (const dueDay of ['0', '29', '1.5', ''])
      expect(sectionPatch('billing', { ...f, dueDay })).toBeNull();
    expect(sectionPatch('times', { ...f, morning: '' })).toBeNull();
    expect(sectionPatch('center', { ...f, phone: '123' })).toBeNull();
  });

  it('BR-8: yoqilgan jarima summasiz saqlanmaydi', () => {
    expect(sectionPatch('penalty', { ...f, penaltyOn: true, perLesson: 0n })).toBeNull();
    expect(sectionPatch('penalty', { ...f, penaltyOn: true, perLesson: 20_000n })).toMatchObject({
      penaltyConfig: { enabled: true, penaltyPerLesson: '20000' },
    });
  });

  it('kartalar: birinchisi asosiy; asosiysi oʻchsa — keyingisi', () => {
    expect(withCard([], 'n', card)).toEqual([
      { ...card, cardNumber: '8600555566667777', id: 'n', isPrimary: true },
    ]);
    expect(withCard(cards, 'c1', card)[0]).toMatchObject({ bankName: 'Bank', isPrimary: true });
    expect(withoutCard(cards, 'c1')).toEqual([{ ...cards[1], isPrimary: true }]);
    expect(withPrimary(cards, 'c2').map((x) => x.isPrimary)).toEqual([false, true]);
    expect(cardValid(card)).toBe(true);
    expect(cardValid({ ...card, cardNumber: '8600 5555' })).toBe(false);
    expect(centerFilled(settings)).toBe(false);
  });
});

describe('MS-32 ekranlari', () => {
  it('notoʻgʻri muddat — MainButton oʻchiq', () => {
    const onSave = vi.fn();
    const view = (dueDay: string) => (
      <SettingsSectionView
        section="billing"
        form={{ ...f, dueDay }}
        onForm={noop}
        saving={false}
        onSave={onSave}
        logo={{ kind: 'empty' }}
        onPickLogo={noop}
      />
    );
    const bad = wrap(view('31'));
    act(() => bad.MainButton.click());
    expect(onSave).not.toHaveBeenCalled();
    cleanup();
    const ok = wrap(view('12'));
    act(() => ok.MainButton.click());
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('karta oʻchirish — tasdiq bilan; asosiy kartada «Asosiy qilish» yoʻq', () => {
    const onRemove = vi.fn();
    wrap(
      <CardView
        form={cards[0] ?? emptyCard}
        saved={cards[0] ?? null}
        saving={false}
        onForm={noop}
        onSave={noop}
        onPrimary={noop}
        onRemove={onRemove}
      />,
    );
    expect(screen.queryByText(t.staffSettings.makePrimary)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.staffSettings.removeCard }));
    expect(onRemove).not.toHaveBeenCalled();
    const inSheet = [...screen.getByRole('dialog').querySelectorAll('button')];
    fireEvent.click(inSheet.find((b) => b.textContent === t.staffSettings.removeCard)!);
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('usta: tayyor qadamlar soni va qadamga oʻtish', () => {
    const onStep = vi.fn();
    wrap(<StartView state={start} onStep={onStep} />);
    expect(screen.getByText('3 / 7 qadam tayyor')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.staffStart.steps.rooms) }));
    expect(onStep).toHaveBeenCalledWith('rooms');
  });
});
