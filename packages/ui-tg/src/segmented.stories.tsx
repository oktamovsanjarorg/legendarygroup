import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Segmented } from './inputs.js';

const meta = {
  title: 'ui-tg/Segmented',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoOptions: Story = {
  render: () => (
    <div className="p-4">
      <Segmented
        label="Kun tanlash"
        value="today"
        options={[
          { value: 'today', label: 'Bugun' },
          { value: 'tomorrow', label: 'Ertaga' },
        ]}
        onChange={() => undefined}
      />
    </div>
  ),
};

export const ThreeOptions: Story = {
  render: () => (
    <div className="p-4">
      <Segmented
        label="Davomat filtri"
        value="all"
        options={[
          { value: 'all', label: 'Barchasi' },
          { value: 'present', label: 'Keldi' },
          { value: 'absent', label: 'Kelmadi' },
        ]}
        onChange={() => undefined}
      />
    </div>
  ),
};

function InteractiveDemo() {
  const [tab, setTab] = useState<'week' | 'month' | 'year'>('month');
  return (
    <div className="p-4">
      <Segmented
        label="Davr tanlash"
        value={tab}
        options={[
          { value: 'week', label: 'Hafta' },
          { value: 'month', label: 'Oy' },
          { value: 'year', label: 'Yil' },
        ]}
        onChange={setTab}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
