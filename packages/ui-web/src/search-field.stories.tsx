import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './search-field.js';

const meta = {
  title: 'ui-web/SearchField',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [val, setVal] = useState('');
    return (
      <div className="max-w-md p-4">
        <SearchField value={val} placeholder="Qidirish…" clearLabel="Tozalash" onChange={setVal} />
      </div>
    );
  },
};

export const WithValue: Story = {
  render: () => {
    const [val, setVal] = useState('Matematika');
    return (
      <div className="max-w-md p-4">
        <SearchField value={val} placeholder="Qidirish…" clearLabel="Tozalash" onChange={setVal} />
      </div>
    );
  },
};
