import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckCircle2, Clock, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ActionSheet, type SheetAction } from './action-sheet.js';

const meta = {
  title: 'ui-tg/ActionSheet',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const STANDARD_ACTIONS: SheetAction[] = [
  {
    label: 'Keldi deb belgilash',
    icon: <CheckCircle2 className="size-5 text-success" aria-hidden />,
    onSelect: () => undefined,
  },
  {
    label: 'Kelmadi deb belgilash',
    icon: <XCircle className="size-5 text-danger" aria-hidden />,
    onSelect: () => undefined,
  },
  {
    label: 'Kech qoldi (15 daqiqa)',
    icon: <Clock className="size-5 text-warning" aria-hidden />,
    onSelect: () => undefined,
  },
];

const DANGER_ACTIONS: SheetAction[] = [
  {
    label: 'Guruhdan chiqarish',
    icon: <Trash2 className="size-5 text-danger" aria-hidden />,
    tone: 'danger',
    onSelect: () => undefined,
  },
];

export const Actions: Story = {
  render: () => (
    <ActionSheet
      open
      title="Ali Valiyev — davomatni oʻzgartirish"
      actions={STANDARD_ACTIONS}
      cancelLabel="Bekor qilish"
      onClose={() => undefined}
    />
  ),
};

export const WithDanger: Story = {
  render: () => (
    <ActionSheet
      open
      title="Haqiqatan ham oʻquvchini guruhdan chiqarmoqchimisiz?"
      actions={DANGER_ACTIONS}
      cancelLabel="Bekor qilish"
      onClose={() => undefined}
    />
  ),
};

export const WithContent: Story = {
  render: () => (
    <ActionSheet
      open
      title="Toʻlovni rad etish"
      actions={[
        {
          label: 'Rad etishni tasdiqlash',
          tone: 'danger',
          onSelect: () => undefined,
        },
      ]}
      cancelLabel="Ortga"
      onClose={() => undefined}
    >
      <div className="px-4 py-2 text-sm text-text-muted">
        Chek noaniq yoki toʻlov summasi bank hisobida topilmadi. Sabab ota-onaga bot orqali
        yuboriladi.
      </div>
    </ActionSheet>
  ),
};

function InteractiveDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-text"
      >
        Menyuni ochish
      </button>
      <ActionSheet
        open={open}
        title="Amallar menyusi"
        actions={STANDARD_ACTIONS}
        cancelLabel="Bekor qilish"
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
