import type { DebtorItem } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { debtorsPath } from '../../data/staff-debtors.js';
import { DebtorsView, type DebtorsViewProps } from './debtors.js';

afterEach(cleanup);
const c = t.debtors;
const item: DebtorItem = {
  id: 'd1',
  name: 'Aliyev Jasur',
  code: 'LG-10001',
  group: 'IELTS',
  debt: '1300000',
  overdueDays: 16,
  lastPayment: null,
  reminders: 0,
  critical: true,
  guardian: { name: 'Nodira', phone: '+998901234567' },
  canRemind: true,
  remindedToday: false,
};

function show(d: Partial<DebtorItem> = {}, over: Partial<DebtorsViewProps> = {}) {
  const fns = { onFilter: vi.fn(), onCard: vi.fn(), onPay: vi.fn(), onRemind: vi.fn() };
  const filter = { bucket: 'all' as const, search: '' };
  const items = [{ ...item, ...d }];
  render(
    <DebtorsView items={items} total={1_300_000n} filter={filter} canPay {...fns} {...over} />,
  );
  return fns;
}
const openRow = () => fireEvent.click(screen.getByRole('button', { name: /Aliyev Jasur/ }));

describe('MS-08 Qarzdorlar (T-132)', () => {
  it('qator: kechikish, BR-22 kritik belgisi; bosilsa — qoʻngʻiroq va amallar', () => {
    const fns = show();
    expect(screen.getByText(/16 kun kechikdi/)).toBeTruthy();
    expect(screen.getByText(c.critical)).toBeTruthy();
    openRow();
    expect(screen.getByRole('link', { name: /Nodira/ }).getAttribute('href')).toBe(
      'tel:+998901234567',
    );
    fireEvent.click(screen.getByRole('button', { name: c.remind }));
    expect(fns.onRemind).toHaveBeenCalledWith(item);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Q-100: Telegram ulanmagan — eslatma tugmasi yoʻq, sababi yozilgan', () => {
    show({ canRemind: false });
    openRow();
    expect(screen.queryByRole('button', { name: c.remind })).toBeNull();
    expect(screen.getByText(c.noTelegram)).toBeTruthy();
  });

  it('Q-100: bugun eslatilgan — ikkinchi marta yuborib boʻlmaydi', () => {
    show({ remindedToday: true });
    expect(screen.getByText(c.reminded)).toBeTruthy();
    openRow();
    expect(screen.queryByRole('button', { name: c.remind })).toBeNull();
  });

  it('toʻlov ruxsati yoʻq — tugma yoʻq', () => {
    show({}, { canPay: false });
    openRow();
    expect(screen.queryByRole('button', { name: c.pay })).toBeNull();
  });

  it('muddat filtri; boʻsh roʻyxatda ham filtr joyida', () => {
    const fns = show({}, { items: [] });
    expect(screen.getByText(c.empty)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: c.buckets.d30 }));
    expect(fns.onFilter).toHaveBeenCalledWith({ bucket: 'd30', search: '' });
  });

  it('soʻrov yoʻli: bir harf — qidiruvsiz; sahifa kursori', () => {
    expect(debtorsPath({ bucket: 'all', search: 'a' }, '')).toBe(
      '/billing/debtors?bucket=all&limit=30',
    );
    expect(debtorsPath({ bucket: 'd30', search: ' ali ' }, '30')).toBe(
      '/billing/debtors?bucket=d30&limit=30&search=ali&cursor=30',
    );
  });
});
