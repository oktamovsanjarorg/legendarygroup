import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './inputs.js';

const meta = {
  title: 'ui-tg/TextField',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-4">
      <TextField label="Test nomi" placeholder="Masalan: Mock IELTS — Reading" />
    </div>
  ),
};

export const NumberWithHint: Story = {
  render: () => (
    <div className="p-4">
      <TextField
        label="Maks. ball"
        type="number"
        inputMode="numeric"
        defaultValue="40"
        hint="1 dan 1000 gacha"
      />
    </div>
  ),
};

export const DateField: Story = {
  render: () => (
    <div className="p-4">
      <TextField label="Sana" type="date" defaultValue="2026-11-16" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="p-4">
      <TextField label="Test nomi" defaultValue="" error="Test nomini kiriting" />
    </div>
  ),
};
