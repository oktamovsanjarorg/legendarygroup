import type { DebtorItem } from '@lg/contracts';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { stateStories } from '../story-kit.js';
import { DebtorsView } from './debtors.js';

const meta: Meta = { title: 'miniapp/Xodim/MS-08 Qarzdorlar (T-132)' };
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const base: DebtorItem = {
  id: 'd1',
  name: 'Aliyev Jasur',
  code: 'LG-10001',
  group: 'IELTS 7.0',
  debt: '1300000',
  overdueDays: 34,
  lastPayment: null,
  reminders: 2,
  critical: true,
  guardian: { name: 'Aliyeva Nodira', phone: '+998901234567' },
  canRemind: true,
  remindedToday: false,
  archived: false,
};
const ITEMS: DebtorItem[] = [
  base,
  {
    ...base,
    id: 'd2',
    name: 'Gʻaniyeva Shahzoda',
    debt: '600000',
    overdueDays: 5,
    critical: false,
    remindedToday: true,
  },
  { ...base, id: 'd3', name: 'Toʻrayev Bek', overdueDays: 0, critical: false, canRemind: false },
];

function Flow({ items }: { items: DebtorItem[] }) {
  const [filter, setFilter] = useState({ bucket: 'all' as const, search: '' });
  return (
    <DebtorsView
      items={items}
      total={2_500_000n}
      filter={filter}
      canPay
      onFilter={(f) => setFilter({ bucket: 'all', search: f.search })}
      onCard={noop}
      onPay={noop}
      onRemind={noop}
      onMore={items.length ? noop : undefined}
    />
  );
}

export const MS08_List: Story = { tags: ['primary'], render: () => <Flow items={ITEMS} /> };
export const MS08_Empty: Story = { render: () => <Flow items={[]} /> };
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
