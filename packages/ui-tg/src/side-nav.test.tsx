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

describe('PassiveControls va toʻliq ekran (T-164)', () => {
  it('passiv hududdagi MainButton Telegram tugmasini egallamaydi', async () => {
    const { createFakeWebApp } = await import('./testing.js');
    const { TelegramProvider } = await import('./provider.js');
    const { PassiveControls, useMainButton } = await import('./controls.js');
    const wa = createFakeWebApp();
    function Btn({ text }: { text: string }) {
      useMainButton({ text, onClick: () => undefined });
      return null;
    }
    render(
      <TelegramProvider webApp={wa}>
        <PassiveControls>
          <Btn text="Roʻyxat" />
        </PassiveControls>
        <Btn text="Saqlash" />
      </TelegramProvider>,
    );
    expect(wa.MainButton.params.text).toBe('Saqlash');
  });

  it('kompyuterda bir marta toʻliq ekran soʻraladi; telefonda — yoʻq', async () => {
    const { createFakeWebApp } = await import('./testing.js');
    const { useDesktopFullscreen } = await import('./side-nav.js');
    function Probe({ wa }: { wa: ReturnType<typeof createFakeWebApp> }) {
      useDesktopFullscreen(wa, true);
      return null;
    }
    const desk = createFakeWebApp();
    render(<Probe wa={desk} />);
    expect(desk.fullscreenRequests).toBe(1);
    const phone = Object.assign(createFakeWebApp(), { platform: 'android' });
    render(<Probe wa={phone} />);
    expect(phone.fullscreenRequests).toBe(0);
  });
});
