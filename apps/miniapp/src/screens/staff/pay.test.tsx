import { formatMoney, miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PayDoneView, type PayPreview, PayView, type PayViewProps } from './pay.js';

afterEach(cleanup);
const wrap = (wa: FakeWebApp, ui: ReactNode) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);

const PREVIEW: PayPreview = {
  debt: 1200000n,
  parts: [
    { period: '2026-10', amount: 600000n, closes: true },
    { period: '2026-11', amount: 600000n, closes: true },
  ],
  advance: 0n,
};

const props = (over: Partial<PayViewProps> = {}): PayViewProps => ({
  student: { name: 'Karimov Aziz', code: 'LG-10001' },
  preview: PREVIEW,
  amount: null,
  method: 'cash',
  saving: false,
  onAmount: vi.fn(),
  onMethod: vi.fn(),
  onSave: vi.fn(),
  ...over,
});

describe('MS-07 toʻlov kiritish (T-131, BR-12)', () => {
  it('summa yoʻq — MainButton yashirin; qarz koʻrinadi; «qarzni toʻliq» summani qoʻyadi', () => {
    const wa = createFakeWebApp();
    const p = props();
    wrap(wa, <PayView {...p} />);
    expect(wa.MainButton.params.is_visible).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^Qarzni/ }));
    expect(p.onAmount).toHaveBeenCalledWith(1200000n);
  });

  it('summa bor — MainButton summa bilan, bosilsa saqlaydi; taqsimot oylar boʻyicha', () => {
    const wa = createFakeWebApp();
    const p = props({ amount: 600000n });
    wrap(wa, <PayView {...p} />);
    expect(wa.MainButton.params).toMatchObject({
      is_visible: true,
      text: `Saqlash · ${formatMoney(600000n)}`,
    });
    wa.MainButton.click();
    expect(p.onSave).toHaveBeenCalledOnce();
    expect(screen.getAllByText('yopiladi')).toHaveLength(2);
  });

  it('usul tanlash — Terminal → card', () => {
    const wa = createFakeWebApp();
    const p = props();
    wrap(wa, <PayView {...p} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Terminal' }));
    expect(p.onMethod).toHaveBeenCalledWith('card');
  });

  it('saqlanmoqda — MainButton bloklangan (ikki marta bosish = bitta toʻlov)', () => {
    const wa = createFakeWebApp();
    wrap(wa, <PayView {...props({ amount: 600000n, saving: true })} />);
    expect(wa.MainButton.params.is_active).toBe(false);
  });

  it('qarz yoʻq — avans izohi', () => {
    wrap(
      createFakeWebApp(),
      <PayView {...props({ preview: { ...PREVIEW, debt: 0n, parts: [] } })} />,
    );
    expect(screen.getByText(/avans sifatida/)).toBeTruthy();
  });

  it('saqlandi — chek raqami, PDF, MainButton «Tayyor»', () => {
    const wa = createFakeWebApp();
    const onReceipt = vi.fn();
    const onFinish = vi.fn();
    wrap(wa, <PayDoneView receipt="LG-2026-000123" onReceipt={onReceipt} onFinish={onFinish} />);
    expect(screen.getByText(/LG-2026-000123/)).toBeTruthy();
    fireEvent.click(screen.getByText(t.staffPay.openReceipt));
    expect(onReceipt).toHaveBeenCalledOnce();
    wa.MainButton.click();
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('ota-ona botga ulanmagan — «yuborildi» deyilmaydi', () => {
    const wa = createFakeWebApp();
    const noop = () => undefined;
    wrap(wa, <PayDoneView receipt="LG-1" notified={0} onReceipt={noop} onFinish={noop} />);
    expect(screen.queryByText(/ota-onaga yuborildi/)).toBeNull();
    expect(screen.getByText(/botga ulanmagan/)).toBeTruthy();
  });
});
