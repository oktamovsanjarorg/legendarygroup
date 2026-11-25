import { formatMoney, miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cashReady } from '../../data/staff-cash.js';
import {
  emptyExpense,
  expenseReady,
  expenseRequest,
  periodRange,
  shiftPeriod,
} from '../../data/staff-finance.js';
import { sortTickets } from '../../data/staff-tickets.js';
import { CashView, type CashViewProps } from './cash.js';
import { ExpenseView } from './expense.js';
import { FinanceView, marginText } from './finance.js';
import { LinkRequestsView, LinkStudentView, RejectLinkView } from './link-requests.js';
import { StaffTicketView } from './tickets.js';
import { cashDay, expense, linkReq, pnl, studentRow, ticket } from './work-mock.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const noop = () => undefined;

describe('MS-11 Bogʻlanish soʻrovlari (T-135)', () => {
  it('qator → qoʻngʻiroq havolasi, bogʻlash va rad etish', () => {
    const onLink = vi.fn();
    const onReject = vi.fn();
    wrap(<LinkRequestsView items={[linkReq]} onLink={onLink} onReject={onReject} />);
    fireEvent.click(button(/Aliyeva Nodira/));
    expect(screen.getByRole('link').getAttribute('href')).toBe('tel:+998901234567');
    fireEvent.click(button(t.linkReq.link));
    expect(onLink).toHaveBeenCalledWith(linkReq);
    fireEvent.click(button(/Aliyeva Nodira/));
    fireEvent.click(button(t.linkReq.reject));
    expect(onReject).toHaveBeenCalledWith(linkReq);
  });

  it('farzand tanlanmaguncha MainButton yoʻq; tanlangach qarindoshlik bilan saqlanadi', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <LinkStudentView
        req={linkReq}
        query="Ali"
        found={[studentRow]}
        saving={false}
        onQuery={noop}
        onSave={onSave}
      />,
    );
    expect(wa.MainButton.params.is_visible).toBe(false);
    fireEvent.click(button(/Aliyev Jasur/));
    fireEvent.click(screen.getByRole('radio', { name: t.studentCard.relations.father }));
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith('s1', 'father');
  });

  it('rad etish — sababsiz boʻlmaydi', () => {
    const onSave = vi.fn();
    const wa = wrap(<RejectLinkView req={linkReq} saving={false} onSave={onSave} />);
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Tanimadik ' } });
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith('Tanimadik');
  });
});

describe('MS-14 Murojaatlar (T-138)', () => {
  const view = (over: object) => (
    <StaffTicketView
      ticket={ticket}
      text=""
      busy={false}
      onText={noop}
      onSend={noop}
      onStatus={noop}
      {...over}
    />
  );

  it('yangi (javobsiz) birinchi, keyin oxirgi xabar boʻyicha', () => {
    const at = (id: string, status: 'open' | 'in_progress', lastMessageAt: string) => ({
      ...ticket,
      id,
      status,
      lastMessageAt,
    });
    const order = sortTickets([
      at('a', 'in_progress', '2026-11-24'),
      at('b', 'open', '2026-11-20'),
      at('c', 'open', '2026-11-22'),
    ]);
    expect(order.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('boʻsh javob yuborilmaydi; matn bor — MainButton', () => {
    const onSend = vi.fn();
    const wa = wrap(view({ text: 'Ha', onSend }));
    act(() => wa.MainButton.click());
    expect(onSend).toHaveBeenCalledOnce();
    cleanup();
    expect(wrap(view({ text: '  ' })).MainButton.params.is_visible).toBe(false);
  });

  it('«Hal boʻldi» ↔ «Qayta ochish»; yopilganda javob maydoni yoʻq', () => {
    const onStatus = vi.fn();
    const wa = wrap(view({ onStatus }));
    act(() => wa.SecondaryButton.click());
    expect(onStatus).toHaveBeenCalledWith('resolved');
    cleanup();
    const closed = wrap(view({ onStatus, ticket: { ...ticket, status: 'closed' } }));
    expect(screen.queryByRole('textbox')).toBeNull();
    act(() => closed.SecondaryButton.click());
    expect(onStatus).toHaveBeenLastCalledWith('in_progress');
  });
});

describe('MS-16 Kassa (T-140, FR-PAY-10)', () => {
  const props = (over: Partial<CashViewProps> = {}): CashViewProps => ({
    day: cashDay,
    today: '2026-11-24',
    form: { counted: 1_300_000n, note: '' },
    saving: false,
    history: [],
    onDate: vi.fn(),
    onForm: vi.fn(),
    onClose: vi.fn(),
    ...over,
  });

  it('farq bor — izohsiz yopilmaydi; nol sanoq ham qiymat', () => {
    expect(cashReady({ counted: null, note: '' }, 0n)).toBe(false);
    expect(cashReady({ counted: 0n, note: '' }, 0n)).toBe(true);
    expect(cashReady({ counted: 1n, note: ' ' }, 0n)).toBe(false);
    expect(cashReady({ counted: 1n, note: 'Qaytim' }, 0n)).toBe(true);
  });

  it('yopish — tasdiq bilan', () => {
    const p = props();
    const wa = wrap(<CashView {...p} />);
    act(() => wa.MainButton.click());
    expect(p.onClose).not.toHaveBeenCalled();
    fireEvent.click(button(t.cash.close));
    expect(p.onClose).toHaveBeenCalledOnce();
  });

  it('yopilgan kun: tugma yoʻq, keyingi naqd harakat ogohlantiriladi', () => {
    const closed = {
      at: '2026-11-24T14:00:00.000Z',
      by: 'Admin',
      expectedCash: '1200000',
      countedCash: '1200000',
      note: null,
    };
    const wa = wrap(<CashView {...props({ day: { ...cashDay, closed } })} />);
    expect(wa.MainButton.params.is_visible).toBe(false);
    expect(screen.getByText(/naqd harakat/).textContent).toBe(
      t.cash.lateChange.replace('{amount}', formatMoney(100_000n)),
    );
  });
});

describe('MS-18 / MS-27 Moliya (T-142, T-143, T-156)', () => {
  it('oy chegaralari va oy almashtirish (yil oʻtishi bilan)', () => {
    expect(periodRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
  });

  it('xarajat: summa majburiy, kelajak sana yoʻq; boʻsh izoh yuborilmaydi', () => {
    const f = emptyExpense('2026-11-24');
    expect(expenseReady(f, '2026-11-24')).toBe(false);
    expect(expenseReady({ ...f, amount: 5n, date: '2026-11-25' }, '2026-11-24')).toBe(false);
    expect(expenseRequest(f, null)).toBeNull();
    expect(expenseRequest({ ...f, amount: 5n, note: ' ' }, 'f1')).toEqual({
      category: 'other',
      amount: '5',
      date: '2026-11-24',
      note: undefined,
      fileId: 'f1',
    });
  });

  it('chek yuklanayotganda saqlab boʻlmaydi', () => {
    const wa = wrap(
      <ExpenseView
        title="x"
        today="2026-11-24"
        form={{ ...emptyExpense('2026-11-24'), amount: 5n }}
        saving={false}
        file={{ kind: 'uploading', name: 'a.jpg', percent: 10 }}
        onPickFile={noop}
        onForm={noop}
        onSave={noop}
      />,
    );
    expect(wa.MainButton.params.is_active).toBe(false);
  });

  it('rentabellik foizda; xarajat ruxsati boʻlmasa roʻyxat va tugma yoʻq', () => {
    expect(marginText(2850)).toContain('28,5');
    const view = (list: (typeof expense)[] | null) => (
      <FinanceView
        pnl={pnl}
        period="2026-11"
        current="2026-11"
        expenses={list}
        onPeriod={noop}
        onAdd={noop}
        onExpense={noop}
      />
    );
    const wa = wrap(view(null));
    expect(wa.MainButton.params.is_visible).toBeFalsy();
    expect(screen.queryByRole('button', { name: t.fin.add })).toBeNull();
    expect(screen.queryByText(t.fin.list)).toBeNull();
    expect(button(t.staffKit.nextMonth)).toHaveProperty('disabled', true);
    cleanup();
    wrap(view([expense]));
    expect(screen.getByRole('button', { name: t.fin.add })).toBeTruthy();
  });
});
