import { formatMoney } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QUEUE, STUDENTS } from './mock.js';
import { ReviewView } from './review.js';
import { matchStudents } from './search.js';

afterEach(cleanup);
const wrap = (wa: FakeWebApp, ui: ReactNode) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
const names = (q: string) => matchStudents(q, STUDENTS).map((s) => s.name);

describe('MS-04 qidiruv (CLAUDE.md: imlo normalizatsiyasi)', () => {
  it("oʻ / o' / o‘ / katta harf — bir xil natija", () => {
    for (const q of ["o'rinboy", 'oʻrinboy', 'o‘rinboy', 'ORINBOY'.replace('OR', "O'R")])
      expect(names(q)).toEqual(['Oʻrinboyeva Malika']);
  });
  it('telefon raqamlari (≥ 4) va ID', () => {
    expect(names('93 555')).toEqual(['Oʻrinboyeva Malika']);
    expect(names('lg-0912')).toEqual(['Gʻaniyeva Shahzoda']);
  });
  it('1 belgi — qidirilmaydi', () => {
    expect(names('a')).toEqual([]);
  });
});

const item = QUEUE[0];
const next = QUEUE[1];

describe('MS-02 chek navbati (FR-PAY-4, BR-13)', () => {
  it('summani tahrirlab tasdiqlash — tahrirlangan bigint uzatiladi', async () => {
    if (!item) throw new Error('mock');
    const wa = createFakeWebApp();
    const onApprove = vi.fn();
    wrap(
      wa,
      <ReviewView item={item} position={1} total={3} onApprove={onApprove} onReject={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Summa/), { target: { value: '600000' } });
    act(() => wa.MainButton.click());
    expect(onApprove).toHaveBeenCalledWith('q1', 600_000n);
  });

  it("keyingi chekka o'tganda summa yangilanadi (oldingisi qolmaydi)", async () => {
    if (!item || !next) throw new Error('mock');
    const wa = createFakeWebApp();
    const r = wrap(
      wa,
      <ReviewView item={item} position={1} total={3} onApprove={vi.fn()} onReject={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Summa/), { target: { value: '1' } });
    r.rerender(
      <TelegramProvider webApp={wa}>
        <ReviewView
          item={{ ...next, amount: 450_000n }}
          position={2}
          total={3}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      </TelegramProvider>,
    );
    expect((screen.getByLabelText(/Summa/) as HTMLInputElement).value).toBe(
      formatMoney(450_000n, { withCurrency: false }),
    );
  });

  it('rad etish — shablon sababi bilan; lock boʻlsa tugmalar faol emas', async () => {
    if (!item) throw new Error('mock');
    const wa = createFakeWebApp();
    const onReject = vi.fn();
    const r = wrap(
      wa,
      <ReviewView item={item} position={1} total={3} onApprove={vi.fn()} onReject={onReject} />,
    );
    act(() => wa.SecondaryButton.click());
    fireEvent.click(await screen.findByRole('button', { name: 'Pul hisobga tushmagan.' }));
    expect(onReject).toHaveBeenCalledWith('q1', 'Pul hisobga tushmagan.');
    r.rerender(
      <TelegramProvider webApp={wa}>
        <ReviewView
          item={{ ...item, id: 'q9', lockedBy: 'Admin B' }}
          position={1}
          total={3}
          onApprove={vi.fn()}
          onReject={onReject}
        />
      </TelegramProvider>,
    );
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(false));
    expect(wa.SecondaryButton.params.is_active).toBe(false);
  });
});
