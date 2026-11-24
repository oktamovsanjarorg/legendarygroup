import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discountCall,
  monthEnd,
  parsePercent,
  refundCall,
  reverseCall,
} from '../../data/staff-payments.js';
import { DiscountFormView, DiscountsView } from './discounts.js';
import { PaymentDetailView, PaymentsView, ReverseView } from './payments.js';
import { InvoiceView, RefundView, StudentFinanceView } from './student-finance.js';
import { finance, historyItems, invoice, paymentView } from './student-mock.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const noop = () => undefined;
const c = t.staffPayments;

describe('MS-24 Toʻlovlar (T-153)', () => {
  it('soʻrov: huquq bor — bevosita, yoʻq — Directorga; qaytarish kaliti bilan', () => {
    expect(reverseCall('p1', 'xato', true)).toEqual({
      path: '/billing/payments/p1/reverse',
      body: { reason: 'xato' },
    });
    expect(reverseCall('p1', 'xato', false)).toMatchObject({
      path: '/approvals',
      body: { type: 'reversal', payload: { paymentId: 'p1' } },
    });
    const refund = { studentId: 's1', amount: '10', method: 'cash', reason: 'ortiqcha' } as const;
    expect(refundCall(refund, true, 'k1')).toMatchObject({ idempotencyKey: 'k1', body: refund });
    expect(refundCall(refund, false, 'k1')).toMatchObject({
      path: '/approvals',
      idempotencyKey: 'k1',
    });
    expect(monthEnd('2026-02')).toBe('2026-02-28');
  });

  it('roʻyxat: bekor qilingani belgilangan; usul filtri; davomi', () => {
    const fns = { onMethod: vi.fn(), onOpen: vi.fn(), onMore: vi.fn() };
    wrap(
      <PaymentsView
        period="2026-11"
        current="2026-11"
        method={null}
        total={600_000n}
        items={historyItems}
        hasMore
        loadingMore={false}
        onStep={noop}
        {...fns}
      />,
    );
    expect(screen.getByText(new RegExp(c.cancelled))).toBeTruthy();
    expect(screen.getByText(new RegExp(c.kinds.reversal))).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: t.staffPay.methods.card }));
    expect(fns.onMethod).toHaveBeenCalledWith('card');
    fireEvent.click(button(/Karimov Aziz/));
    expect(fns.onOpen).toHaveBeenCalledWith('p1');
    fireEvent.click(button(c.more));
    expect(fns.onMore).toHaveBeenCalledOnce();
  });

  it('tafsilot: ruxsat boʻlsa bekor qilish; bekor qilingani — sababi', () => {
    const props = { onStudent: noop, onReceipt: noop };
    wrap(<PaymentDetailView v={paymentView} {...props} onReverse={noop} />);
    expect(button(c.reverse)).toBeTruthy();
    cleanup();
    const reversed = { reason: 'Adashib kiritilgan', at: '2026-11-21T10:00:00Z' };
    wrap(<PaymentDetailView v={{ ...paymentView, reversed }} {...props} />);
    expect(screen.queryByText(c.reverse)).toBeNull();
    expect(screen.getByText(/Adashib kiritilgan/)).toBeTruthy();
  });

  it('BR-16: kechagi toʻlov — «Soʻrov yuborish», sabab shart', () => {
    const onSave = vi.fn();
    const wa = wrap(<ReverseView v={paymentView} saving={false} onSave={onSave} />);
    expect(wa.MainButton.params).toMatchObject({ text: c.sendRequest, is_active: false });
    type(c.reason, 'Xato summa');
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith('Xato summa');
  });
});

describe('Oʻquvchi hisobi (T-153, BR-8, BR-17)', () => {
  it('avans bor — qaytarish; hisob va toʻlov ochiladi', () => {
    const fns = { onInvoice: vi.fn(), onPayment: vi.fn(), onRefund: vi.fn() };
    wrap(<StudentFinanceView student="A" f={finance} {...fns} />);
    fireEvent.click(button(t.staffFinance.refund));
    fireEvent.click(button(/noyabr/i));
    fireEvent.click(button(/LG-2026-000100/));
    expect(fns.onRefund).toHaveBeenCalledOnce();
    expect(fns.onInvoice).toHaveBeenCalledWith('i1');
    expect(fns.onPayment).toHaveBeenCalledWith('p1');
    cleanup();
    const noAdvance = { ...finance, summary: { ...finance.summary, totalAdvance: '0' } };
    wrap(<StudentFinanceView student="A" f={noAdvance} {...fns} />);
    expect(screen.queryByText(t.staffFinance.refund)).toBeNull();
    expect(screen.getByText(t.staffFinance.settled)).toBeTruthy();
  });

  it('BR-8: faqat summasi bor jarima bekor qilinadi', () => {
    const onWaive = vi.fn();
    wrap(<InvoiceView invoice={invoice} onWaive={onWaive} />);
    expect(screen.getAllByText(t.staffFinance.waive)).toHaveLength(1);
    fireEvent.click(button(/4 sababsiz/));
    expect(onWaive).toHaveBeenCalledWith('l2');
    cleanup();
    wrap(<InvoiceView invoice={invoice} />);
    expect(screen.queryByText(t.staffFinance.waive)).toBeNull();
  });

  it('BR-17: avansdan koʻp emas; Admin — soʻrov', () => {
    const onSave = vi.fn();
    const props = { student: 'A', advance: 120_000n, saving: false, onSave };
    const wa = wrap(<RefundView {...props} direct={false} />);
    expect(wa.MainButton.params.text).toBe(c.sendRequest);
    type(c.reason, 'Koʻchib ketdi');
    type(t.staffFinance.refundAmount, '130000');
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.click(button(/Hammasi/));
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith({
      amount: 120_000n,
      method: 'cash',
      reason: 'Koʻchib ketdi',
    });
  });
});

describe('MS-17 Chegirmalar (T-141, BR-18)', () => {
  it('foiz 0–100 butun; limitdan yuqori — soʻrov', () => {
    expect([parsePercent('10'), parsePercent('101'), parsePercent('1.5')]).toEqual([
      10,
      null,
      null,
    ]);
    const body = { enrollmentId: 'e1', percent: 5, reason: 'aka-uka' };
    expect(discountCall(body, true)).toMatchObject({ method: 'PATCH' });
    expect(discountCall(body, false)).toMatchObject({ path: '/approvals' });
    const onSave = vi.fn();
    const form = (limit: number | null) => (
      <DiscountFormView
        student="A"
        group="G"
        initial={0}
        limit={limit}
        saving={false}
        onSave={onSave}
      />
    );
    let wa = wrap(form(10));
    type(t.staffDiscounts.reason, 'Aka-uka');
    expect(wa.MainButton.params.is_active).toBe(false);
    type(t.staffDiscounts.percent, '30');
    expect(wa.MainButton.params.text).toBe(t.staffDiscounts.sendRequest);
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith({ percent: 30, reason: 'Aka-uka', direct: false });
    cleanup();
    wa = wrap(form(null));
    type(t.staffDiscounts.percent, '30');
    expect(wa.MainButton.params.text).toBe(t.staffDiscounts.save);
  });

  it('roʻyxat: kim, nega, necha foiz', () => {
    const item = {
      enrollmentId: 'e1',
      studentId: 's1',
      student: 'Karimov Aziz',
      group: 'IELTS-1',
      percent: 10,
      reason: 'Aka-uka',
      by: 'Director',
    };
    const onOpen = vi.fn();
    wrap(<DiscountsView items={[item]} onOpen={onOpen} />);
    fireEvent.click(button(/Karimov Aziz.*Aka-uka.*10%/));
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});
