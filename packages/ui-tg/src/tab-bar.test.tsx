import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar, Home } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { TabBar, type TabItem } from './tab-bar.js';

const items: TabItem[] = [
  { screen: 'MT-01', to: '/', label: 'Bugun', icon: Home },
  { screen: 'MT-06', to: '/schedule', label: 'Jadval', icon: Calendar },
];

describe('TabBar', () => {
  it('faol tab belgilangan; boshqasini bosish — tanlanadi, faolini bosish — hech narsa', async () => {
    const onSelect = vi.fn();
    render(<TabBar items={items} active="/" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Bugun' }).getAttribute('aria-current')).toBe('page');
    await userEvent.click(screen.getByRole('button', { name: 'Bugun' }));
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Jadval' }));
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it("badge: ekran o'quvchi uchun nom «Navbat (3)»", () => {
    render(
      <TabBar
        items={[...items, { screen: 'MS-02', to: '/queue', label: 'Navbat', icon: Home, badge: 3 }]}
        active="/"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Navbat (3)' })).toBeTruthy();
  });
});
