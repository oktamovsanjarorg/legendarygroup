import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SelectField } from './select.js';

const meta = {
  title: 'ui-web/SelectField',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'Ustoz' },
  { value: 'admin', label: 'Administrator' },
  { value: 'finance', label: 'Moliya mutaxassisi' },
  { value: 'director', label: 'Direktor' },
];

export const Default: Story = {
  render: () => (
    <div className="max-w-sm p-4">
      <SelectField label="Xodim roli" options={ROLE_OPTIONS} defaultValue="teacher" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="max-w-sm p-4">
      <SelectField
        label="Guruh fani"
        options={[
          { value: '', label: 'Fanni tanlang…' },
          { value: 'english', label: 'Ingliz tili (IELTS)' },
          { value: 'math', label: 'Matematika' },
        ]}
        defaultValue=""
        error="Kurs fanini tanlash majburiy"
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-sm p-4">
      <SelectField
        label="Filial"
        options={[{ value: 'main', label: 'Bosh filial (Yunusobod)' }]}
        defaultValue="main"
        disabled
      />
    </div>
  ),
};

function InteractiveDemo() {
  const [val, setVal] = useState('teacher');
  return (
    <div className="max-w-sm p-4">
      <SelectField
        label="Xodim vakolati"
        value={val}
        options={ROLE_OPTIONS}
        onChange={(e) => setVal(e.target.value)}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
