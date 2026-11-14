import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge.js';

const meta = {
  title: 'ui-web/Badge',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  render: () => <Badge tone="success">Tasdiqlandi</Badge>,
};

export const Danger: Story = {
  render: () => <Badge tone="danger">Rad etildi</Badge>,
};

export const Warning: Story = {
  render: () => <Badge tone="warning">Kutilmoqda</Badge>,
};

export const Muted: Story = {
  render: () => <Badge tone="muted">Arxivlangan</Badge>,
};

export const Info: Story = {
  render: () => <Badge tone="info">Tekshirilmoqda</Badge>,
};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <Badge tone="success">Tasdiqlandi</Badge>
      <Badge tone="danger">Qarzdor</Badge>
      <Badge tone="warning">Kutilmoqda</Badge>
      <Badge tone="muted">Nofaol</Badge>
      <Badge tone="info">Yangi</Badge>
    </div>
  ),
};
