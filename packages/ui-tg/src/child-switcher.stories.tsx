import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ChildSwitcher, type ChildTab } from './child-switcher.js';

const meta = {
  title: 'ui-tg/ChildSwitcher',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ONE_CHILD: readonly ChildTab[] = [{ id: 'c1', name: 'Ali Valiyev' }];

const TWO_CHILDREN: readonly ChildTab[] = [
  { id: 'c1', name: 'Ali Valiyev' },
  { id: 'c2', name: 'Zuhra Valiyeva' },
];

const THREE_CHILDREN: readonly ChildTab[] = [
  { id: 'c1', name: 'Ali Valiyev' },
  { id: 'c2', name: 'Zuhra Valiyeva' },
  { id: 'c3', name: 'Hasan Valiyev' },
];

export const SingleChild: Story = {
  render: () => (
    <div className="p-4">
      <p className="mb-2 text-xs text-text-muted">
        Bitta farzand boʻlganda komponent chizilmaydi (null qaytaradi):
      </p>
      <ChildSwitcher
        label="Farzand tanlash"
        items={ONE_CHILD}
        selected="c1"
        onSelect={() => undefined}
      />
    </div>
  ),
};

export const TwoChildren: Story = {
  render: () => (
    <div className="p-4">
      <ChildSwitcher
        label="Farzand tanlash"
        items={TWO_CHILDREN}
        selected="c1"
        onSelect={() => undefined}
      />
    </div>
  ),
};

export const ThreeChildren: Story = {
  render: () => (
    <div className="p-4">
      <ChildSwitcher
        label="Farzand tanlash"
        items={THREE_CHILDREN}
        selected="c2"
        onSelect={() => undefined}
      />
    </div>
  ),
};

function InteractiveDemo() {
  const [selected, setSelected] = useState('c1');
  return (
    <div className="p-4">
      <ChildSwitcher
        label="Farzand tanlash"
        items={THREE_CHILDREN}
        selected={selected}
        onSelect={setSelected}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
