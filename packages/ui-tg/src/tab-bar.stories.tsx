import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpen, CalendarDays, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { TabBar, type TabItem } from './tab-bar.js';

/** Ustoz pastki menyusi namunasi (11-ux §2). */
const TEACHER: TabItem[] = [
  { screen: 'MT-01', to: '/', label: 'Bugun', icon: Sun },
  { screen: 'MT-04', to: '/groups', label: 'Guruhlarim', icon: BookOpen },
  { screen: 'MT-09', to: '/schedule', label: 'Jadval', icon: CalendarDays },
  { screen: 'MT-11', to: '/profile', label: 'Profil', icon: User },
];

function Demo() {
  const [active, setActive] = useState('/');
  return <TabBar items={TEACHER} active={active} onSelect={(i) => setActive(i.to)} />;
}

const meta = { title: 'ui-tg/TabBar' } satisfies Meta;
export default meta;

export const Teacher: StoryObj<typeof meta> = { render: () => <Demo /> };
