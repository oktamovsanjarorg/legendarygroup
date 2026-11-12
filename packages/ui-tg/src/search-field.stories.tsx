import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './search-field.js';

const meta = {
  title: 'ui-tg/SearchField',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="p-4">
      <SearchField
        value=""
        placeholder="Ism, telefon yoki ID"
        clearLabel="Tozalash"
        onChange={() => undefined}
      />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => (
    <div className="p-4">
      <SearchField
        value="Ali Valiyev"
        placeholder="Ism, telefon yoki ID"
        clearLabel="Tozalash"
        onChange={() => undefined}
      />
    </div>
  ),
};

function InteractiveDemo() {
  const [val, setVal] = useState('Matematika');
  return (
    <div className="p-4">
      <SearchField value={val} placeholder="Qidirish..." clearLabel="Tozalash" onChange={setVal} />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
