import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tabs } from './tabs.js';

afterEach(cleanup);

describe('Tabs (design-system §4)', () => {
  const items = [
    { value: 'all', label: 'Barchasi', count: 186 },
    { value: 'debtors', label: 'Qarzdorlar', count: 12 },
  ];

  it('tablist va tablarni chizadi, faol tabda aria-selected=true', () => {
    render(<Tabs label="Oʻquvchilar filtri" value="all" items={items} onChange={vi.fn()} />);

    expect(screen.getByRole('tablist', { name: 'Oʻquvchilar filtri' })).toBeTruthy();
    const allTab = screen.getByRole('tab', { name: 'Barchasi 186' });
    const debtorsTab = screen.getByRole('tab', { name: 'Qarzdorlar 12' });

    expect(allTab.getAttribute('aria-selected')).toBe('true');
    expect(debtorsTab.getAttribute('aria-selected')).toBe('false');
    expect(screen.getByText('186')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('tab bosilganda onChange chaqiriladi', () => {
    const onChange = vi.fn();
    render(<Tabs label="Oʻquvchilar filtri" value="all" items={items} onChange={onChange} />);

    const debtorsTab = screen.getByRole('tab', { name: 'Qarzdorlar 12' });
    fireEvent.click(debtorsTab);
    expect(onChange).toHaveBeenCalledWith('debtors');
  });
});
