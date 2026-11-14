import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckCircle2, Clock4, FileText, Info, XCircle } from 'lucide-react';
import { StatusChip } from './status-chip.js';

const meta = {
  title: 'ui-tg/StatusChip',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  render: () => (
    <StatusChip tone="success" icon={<CheckCircle2 className="size-4" aria-hidden />}>
      Tasdiqlandi
    </StatusChip>
  ),
};

export const Danger: Story = {
  render: () => (
    <StatusChip tone="danger" icon={<XCircle className="size-4" aria-hidden />}>
      Rad etildi
    </StatusChip>
  ),
};

export const Warning: Story = {
  render: () => (
    <StatusChip tone="warning" icon={<Clock4 className="size-4" aria-hidden />}>
      15 daq kech
    </StatusChip>
  ),
};

export const Muted: Story = {
  render: () => (
    <StatusChip tone="muted" icon={<FileText className="size-4" aria-hidden />}>
      Sababli
    </StatusChip>
  ),
};

export const InfoTone: Story = {
  render: () => (
    <StatusChip tone="info" icon={<Info className="size-4" aria-hidden />}>
      Tekshirilmoqda
    </StatusChip>
  ),
};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      <StatusChip tone="success" icon={<CheckCircle2 className="size-4" aria-hidden />}>
        Tasdiqlandi
      </StatusChip>
      <StatusChip tone="danger" icon={<XCircle className="size-4" aria-hidden />}>
        Rad etildi
      </StatusChip>
      <StatusChip tone="warning" icon={<Clock4 className="size-4" aria-hidden />}>
        Kech qoldi
      </StatusChip>
      <StatusChip tone="muted" icon={<FileText className="size-4" aria-hidden />}>
        Sababli
      </StatusChip>
      <StatusChip tone="info" icon={<Info className="size-4" aria-hidden />}>
        Kutilmoqda
      </StatusChip>
    </div>
  ),
};
