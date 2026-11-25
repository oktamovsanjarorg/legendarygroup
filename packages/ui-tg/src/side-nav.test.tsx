import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { House, Users, Wallet } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeItem, SideNav, type SideNavGroup } from './side-nav.js';
import { QuickActions } from './action-tile.js';

afterEach(cleanup);

const GROUPS: SideNavGroup[] = [
  {
    key: 'main',
    items: [
      { to: '/', label: 'Bugun', icon: House },
      { to: '/staff/search', label: 'Oʻquvchilar', icon: Users },
    ],
  },
  {
    key: 'money',
    title: 'Pul',
    items: [{ to: '/staff/pay', label: 'Toʻlov', icon: Wallet, badge: 3 }],
  },
];

describe('SideNav (T-164, Q-113)', () => {
  it('eng uzun mos yoʻl faol; «/» faqat aynan bosh sahifada', () => {
    expect(activeItem(GROUPS, '/')).toBe('/');
    expect(activeItem(GROUPS, '/staff/pay')).toBe('/staff/pay');
    expect(activeItem(GROUPS, '/staff/search/x')).toBe('/staff/search');
    expect(activeItem(GROUPS, '/staff/student/1')).toBeNull();
  });

  it('boʻlim sarlavhasi, son belgisi; faol bandni qayta bosish — hech narsa', () => {
    const onSelect = vi.fn();
    render(<SideNav groups={GROUPS} active="/" onSelect={onSelect} />);
    expect(screen.getByText('Pul')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    fireEvent.click(screen.getByText('Bugun'));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Toʻlov'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ to: '/staff/pay' }));
  });
});

describe('QuickActions (Q-113)', () => {
  it('boʻsh roʻyxat — hech narsa; bosilsa amal', () => {
    const { container } = render(<QuickActions items={[]} />);
    expect(container.innerHTML).toBe('');
    const onClick = vi.fn();
    render(
      <QuickActions items={[{ key: 'pay', label: 'Toʻlov', icon: Wallet, badge: 2, onClick }]} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Toʻlov (2)' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
