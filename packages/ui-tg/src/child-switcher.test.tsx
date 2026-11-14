import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChildSwitcher, type ChildTab } from './child-switcher.js';

afterEach(cleanup);

describe('ChildSwitcher (MG-01/02/05)', () => {
  it('0 yoki 1 ta farzand boʻlganda null qaytaradi (chizilmaydi)', () => {
    const { container: c0 } = render(
      <ChildSwitcher label="Farzand" items={[]} selected="" onSelect={vi.fn()} />,
    );
    expect(c0.firstChild).toBeNull();

    const oneChild: ChildTab[] = [{ id: '1', name: 'Ali' }];
    const { container: c1 } = render(
      <ChildSwitcher label="Farzand" items={oneChild} selected="1" onSelect={vi.fn()} />,
    );
    expect(c1.firstChild).toBeNull();
  });

  it('2 yoki undan ortiq farzandda tablist chiziladi va tanlanganida aria-selected=true', () => {
    const items: ChildTab[] = [
      { id: '1', name: 'Ali' },
      { id: '2', name: 'Vali' },
    ];
    render(<ChildSwitcher label="Farzand tanlash" items={items} selected="1" onSelect={vi.fn()} />);

    expect(screen.getByRole('tablist', { name: 'Farzand tanlash' })).toBeTruthy();
    const aliTab = screen.getByRole('tab', { name: 'Ali' });
    const valiTab = screen.getByRole('tab', { name: 'Vali' });

    expect(aliTab.getAttribute('aria-selected')).toBe('true');
    expect(valiTab.getAttribute('aria-selected')).toBe('false');
  });

  it('boshqa farzand tanlansa onSelect uning id si bilan chaqiriladi', () => {
    const onSelect = vi.fn();
    const items: ChildTab[] = [
      { id: '1', name: 'Ali' },
      { id: '2', name: 'Vali' },
    ];
    render(
      <ChildSwitcher label="Farzand tanlash" items={items} selected="1" onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Vali' }));
    expect(onSelect).toHaveBeenCalledWith('2');
  });
});
