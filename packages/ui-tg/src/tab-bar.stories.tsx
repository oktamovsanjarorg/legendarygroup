import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpen, CalendarDays, CheckSquare, Inbox, Search, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { TabBar, type TabItem } from './tab-bar.js';

/** Ustoz pastki menyusi namunasi (11-ux §2). */
const TEACHER: TabItem[] = [
  { screen: 'MT-01', to: '/', label: 'Bugun', icon: Sun },
  { screen: 'MT-04', to: '/groups', label: 'Guruhlarim', icon: BookOpen },
  { screen: 'MT-09', to: '/schedule', label: 'Jadval', icon: CalendarDays },
  { screen: 'MT-11', to: '/profile', label: 'Profil', icon: User },
];

/** Xodim pastki menyusi va son belgisi (badge) namunasi (MS-01…04). */
const STAFF: TabItem[] = [
  { screen: 'MS-01', to: '/staff', label: 'Bugun', icon: Sun },
  { screen: 'MS-02', to: '/staff/queue', label: 'Navbat', icon: Inbox, badge: 5 },
  { screen: 'MS-03', to: '/staff/approvals', label: 'Soʻrovlar', icon: CheckSquare, badge: 2 },
  { screen: 'MS-04', to: '/staff/search', label: 'Qidiruv', icon: Search },
];

function TeacherDemo() {
  const [active, setActive] = useState('/');
  return <TabBar items={TEACHER} active={active} onSelect={(i) => setActive(i.to)} />;
}

function BadgeDemo() {
  const [active, setActive] = useState('/staff/queue');
  return <TabBar items={STAFF} active={active} onSelect={(i) => setActive(i.to)} />;
}

const meta = { title: 'ui-tg/TabBar' } satisfies Meta;
export default meta;

export const Teacher: StoryObj<typeof meta> = { render: () => <TeacherDemo /> };
export const WithBadge: StoryObj<typeof meta> = { render: () => <BadgeDemo /> };
