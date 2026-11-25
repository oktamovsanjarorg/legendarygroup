import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert, House, Receipt, UserPlus, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { QuickActions } from './action-tile.js';
import { SideNav, type SideNavGroup } from './side-nav.js';

const meta: Meta = { title: 'ui-tg/Navigatsiya (Q-113)' };
export default meta;
type Story = StoryObj<typeof meta>;

const GROUPS: SideNavGroup[] = [
  {
    key: 'main',
    items: [
      { to: '/', label: 'Bugun', icon: House, badge: 4 },
      { to: '/staff/search', label: 'Oʻquvchilar', icon: Users },
      { to: '/staff/pay', label: 'Toʻlov', icon: Wallet },
    ],
  },
  {
    key: 'money',
    title: 'Pul',
    items: [
      { to: '/staff/queue', label: 'Chek navbati', icon: Receipt, badge: 4 },
      { to: '/staff/debtors', label: 'Qarzdorlar', icon: CircleAlert },
    ],
  },
];

function SideDemo() {
  const [active, setActive] = useState('/');
  return <SideNav groups={GROUPS} active={active} onSelect={(i) => setActive(i.to)} />;
}

const noop = () => undefined;

export const YonPanel: Story = { tags: ['primary'], render: () => <SideDemo /> };
export const TezkorAmallar: Story = {
  render: () => (
    <div className="bg-surface p-2">
      <QuickActions
        items={[
          { key: 'pay', label: 'Toʻlov kiritish', icon: Wallet, onClick: noop },
          { key: 'new', label: 'Yangi oʻquvchi', icon: UserPlus, onClick: noop },
          { key: 'queue', label: 'Chek navbati', icon: Receipt, badge: 4, onClick: noop },
        ]}
      />
    </div>
  ),
};
