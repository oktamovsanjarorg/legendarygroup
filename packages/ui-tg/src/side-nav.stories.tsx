import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ArrowDownAZ,
  BookOpen,
  House,
  Receipt,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { QuickActions } from './action-tile.js';
import { FilterBar, FilterSelect, FilterToggle } from './filter.js';
import { CommandPalette } from './command-palette.js';
import { SideNav, type SideNavGroup } from './side-nav.js';

const meta: Meta = { title: 'ui-tg/Navigatsiya (Q-113, T-174)' };
export default meta;
type Story = StoryObj<typeof meta>;

const GROUPS: SideNavGroup[] = [
  {
    key: 'main',
    items: [
      { to: '/', label: 'Bugun', icon: House },
      { to: '/staff/search', label: 'Oʻquvchilar', icon: Users },
      { to: '/staff/assistant', label: 'Yordamchi', icon: Sparkles },
    ],
  },
  {
    key: 'money',
    title: 'Pul',
    items: [
      { to: '/staff/pay', label: 'Toʻlov kiritish', icon: Wallet },
      { to: '/staff/receipts', label: 'Chek navbati', icon: Receipt, badge: 4 },
    ],
  },
  {
    key: 'lessons',
    title: 'Darslar',
    items: [{ to: '/staff/groups', label: 'Guruhlar', icon: BookOpen }],
  },
];

export const YonPanel: Story = {
  tags: ['primary'],
  render: () => {
    const [path, setPath] = useState('/staff/pay');
    return (
      <div className="h-[600px]">
        <SideNav
          groups={GROUPS}
          active={path}
          onSelect={(i) => setPath(i.to)}
          brand={<b className="text-text">Legendary</b>}
          search={{ label: 'Qidirish…', hint: 'Ctrl K', onClick: () => undefined }}
        />
      </div>
    );
  },
};

export const BuyruqlarOynasi: Story = {
  render: () => (
    <CommandPalette
      open
      onClose={() => undefined}
      commands={GROUPS.flatMap((g) =>
        g.items.map((i) => ({
          key: i.to,
          label: i.label,
          group: g.title,
          icon: i.icon,
          run: () => undefined,
        })),
      )}
      dynamic={(q) => ({
        before: [],
        after: [
          {
            key: 'ask',
            label: `Yordamchidan soʻrash: «${q}»`,
            icon: Sparkles,
            run: () => undefined,
          },
        ],
      })}
      placeholder="Boʻlim, oʻquvchi yoki savol yozing…"
      empty="Hech narsa topilmadi"
      closeLabel="Yopish"
    />
  ),
};

const noop = () => undefined;

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

export const Filtrlar: Story = {
  render: () => {
    const [course, setCourse] = useState('all');
    const [sort, setSort] = useState('name');
    const [archived, setArchived] = useState(false);
    return (
      <div className="bg-surface p-3">
        <FilterBar label="Filtrlar">
          <FilterSelect
            label="Fan"
            icon={BookOpen}
            value={course}
            defaultValue="all"
            options={[
              { value: 'all', label: 'Barcha fanlar' },
              { value: 'math', label: 'Matematika' },
              { value: 'eng', label: 'Ingliz tili' },
            ]}
            onChange={setCourse}
          />
          <FilterSelect
            label="Tartib"
            icon={ArrowDownAZ}
            value={sort}
            defaultValue="name"
            options={[
              { value: 'name', label: 'Ism (A–Z)' },
              { value: 'code', label: 'Kod' },
              { value: 'newest', label: 'Yangi qoʻshilgan' },
            ]}
            onChange={setSort}
          />
          <FilterToggle label="Arxiv" on={archived} onChange={setArchived} />
        </FilterBar>
      </div>
    );
  },
};
