import type { PaymentMethod } from '@lg/contracts';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PayDoneView, type PayPreview, PayView } from './pay.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Xodim/MS-07 Toʻlov' };
export default meta;
type Story = StoryObj<typeof meta>;

const STUDENT = { name: 'Karimov Aziz', code: 'LG-10001' };
const PREVIEW: PayPreview = {
  debt: 1200000n,
  parts: [
    { period: '2026-10', amount: 600000n, closes: true },
    { period: '2026-11', amount: 400000n, closes: false },
  ],
  advance: 0n,
};

function Interactive({ preview }: { preview: PayPreview }) {
  const [amount, setAmount] = useState<bigint | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  return (
    <PayView
      student={STUDENT}
      preview={amount === null ? { ...preview, parts: [] } : preview}
      amount={amount}
      method={method}
      saving={false}
      onAmount={setAmount}
      onMethod={setMethod}
      onSave={noop}
    />
  );
}

export const MS07_Pay: Story = {
  tags: ['primary'],
  render: () => <Interactive preview={PREVIEW} />,
};
export const MS07_NoDebt: Story = {
  render: () => <Interactive preview={{ debt: 0n, parts: [], advance: 300000n }} />,
};
export const MS07_Saving: Story = {
  render: () => (
    <PayView
      student={STUDENT}
      preview={PREVIEW}
      amount={1000000n}
      method="card"
      saving
      onAmount={noop}
      onMethod={noop}
      onSave={noop}
    />
  ),
};
export const MS07_Done: Story = {
  render: () => <PayDoneView receipt="LG-2026-000123" onReceipt={noop} onFinish={noop} />,
};
