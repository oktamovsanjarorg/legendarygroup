import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from './button.js';
import { Drawer } from './drawer.js';
import { Field } from './field.js';
import { MoneyField } from './money-field.js';

const meta = {
  title: 'ui-web/Drawer',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => (
    <Drawer open title="Yangi oʻquvchi qoʻshish" closeLabel="Yopish" onClose={() => undefined}>
      <div className="flex flex-col gap-4 py-2">
        <Field label="F.I.SH." defaultValue="Ali Valiyev" />
        <Field label="Telefon raqami" defaultValue="+998 90 123 45 67" />
        <Field label="Tugʻilgan sanasi" type="date" defaultValue="2010-05-15" />
      </div>
    </Drawer>
  ),
};

function PaymentDrawer() {
  const [amount, setAmount] = useState<bigint | null>(650_000n);
  return (
    <Drawer
      open
      title="Toʻlov qabul qilish"
      closeLabel="Yopish"
      onClose={() => undefined}
      footer={
        <>
          <Button variant="secondary" onClick={() => undefined}>
            Bekor qilish
          </Button>
          <Button onClick={() => undefined}>Toʻlovni saqlash</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <Field label="Oʻquvchi" defaultValue="Ali Valiyev (LG-10002)" disabled />
        <MoneyField label="Summa" value={amount} onChange={setAmount} />
        <Field label="Izoh" placeholder="Toʻlov haqida qoʻshimcha maʼlumot" />
      </div>
    </Drawer>
  );
}

export const WithFooter: Story = { render: () => <PaymentDrawer /> };

function InteractiveDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Panelni ochish</Button>
      <Drawer
        open={open}
        title="Oʻquvchi maʼlumotlari"
        closeLabel="Yopish"
        onClose={() => setOpen(false)}
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Yopish
          </Button>
        }
      >
        <div className="py-2 text-sm text-text-muted">
          Esc tugmasi yoki fonga bosish orqali panelni yopish mumkin.
        </div>
      </Drawer>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
