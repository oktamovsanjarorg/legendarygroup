import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextArea } from './inputs.js';

const meta = {
  title: 'ui-tg/TextArea',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-4">
      <TextArea label="Sabab yoki izoh" placeholder="Masalan: shifokor koʻrigiga boradi." />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => (
    <div className="p-4">
      <TextArea
        label="Sabab yoki izoh"
        defaultValue="Oʻquvchi oilaviy sabablarga koʻra bugungi darsda qatnasha olmaydi."
      />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="p-4">
      <TextArea
        label="Rad etish sababi"
        defaultValue=""
        error="Rad etish sababini kiritish majburiy"
        placeholder="Nima uchun chek rad etilayotganini yozing"
      />
    </div>
  ),
};

function InteractiveDemo() {
  const [text, setText] = useState('');
  return (
    <div className="p-4">
      <TextArea
        label="Fikr yoki taklif"
        placeholder="Fikringizni bu yerga yozing..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
