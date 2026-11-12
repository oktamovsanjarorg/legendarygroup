import { NBSP } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuardianHomeView } from './home.js';
import { CARD, CHILD_TABS, CHILDREN } from './mock.js';
import { PayView } from './pay.js';
import { SubmissionView } from './submission.js';

afterEach(cleanup);
const wrap = (wa: FakeWebApp, ui: ReactNode) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
const noop = () => undefined;

describe('MG-06 Toʻlov qilish (FR-PAY-3)', () => {
  it("summa qarz bilan to'ldiriladi; chek tayyor bo'lmaguncha Yuborish yopiq", async () => {
    const wa = createFakeWebApp();
    wrap(
      wa,
      <PayView
        childTabs={CHILD_TABS}
        initialChild="c1"
        debt={650_000n}
        card={CARD}
        file={{ kind: 'empty' }}
        onPickFile={noop}
        onSubmit={vi.fn()}
      />,
    );
    expect((screen.getByLabelText('Summa') as HTMLInputElement).value).toBe(`650${NBSP}000`);
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(false));
  });

  it('chek tayyor → summani oʻzgartirib yuborish: bigint va farzand uzatiladi', async () => {
    const wa = createFakeWebApp();
    const onSubmit = vi.fn();
    wrap(
      wa,
      <PayView
        childTabs={CHILD_TABS}
        initialChild="c1"
        debt={650_000n}
        card={CARD}
        file={{ kind: 'ready', name: 'chek.jpg' }}
        onPickFile={noop}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Summa'), { target: { value: '1300000' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Sardor' }));
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(true));
    act(() => wa.MainButton.click());
    expect(onSubmit).toHaveBeenCalledWith({ childId: 'c2', amount: 1_300_000n, comment: '' });
  });
});

describe('MG-01 / MG-07 MainButton', () => {
  it("qarz bo'lsa — «To'lash», avansda — yo'q", async () => {
    const wa = createFakeWebApp();
    const r = wrap(
      wa,
      <GuardianHomeView items={CHILDREN} selected="c1" onSelect={noop} onPay={noop} />,
    );
    await waitFor(() =>
      expect(wa.MainButton.params).toMatchObject({ text: 'Toʻlash', is_visible: true }),
    );
    r.rerender(
      <TelegramProvider webApp={wa}>
        <GuardianHomeView items={CHILDREN} selected="c2" onSelect={noop} onPay={noop} />
      </TelegramProvider>,
    );
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(false));
  });

  it('«Qayta yuborish» faqat rad etilgan chekda (BR-13)', async () => {
    const wa = createFakeWebApp();
    const s = { childName: 'A', amount: 1n, sentAt: new Date(0) };
    const r = wrap(
      wa,
      <SubmissionView
        s={{ ...s, status: { kind: 'pending_review' } }}
        onResend={noop}
        onReceipt={noop}
      />,
    );
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(false));
    r.rerender(
      <TelegramProvider webApp={wa}>
        <SubmissionView
          s={{ ...s, status: { kind: 'rejected', reason: 'x' } }}
          onResend={noop}
          onReceipt={noop}
        />
      </TelegramProvider>,
    );
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(true));
  });
});
