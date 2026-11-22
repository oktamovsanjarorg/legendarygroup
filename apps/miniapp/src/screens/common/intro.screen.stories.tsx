import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type IntroKind, IntroView } from './intro.js';

const meta: Meta = { title: 'miniapp/Umumiy/C-06 Tanishtiruv' };
export default meta;
type Story = StoryObj<typeof meta>;

function Flow({ kind }: { kind: IntroKind }) {
  const [index, setIndex] = useState(0);
  return <IntroView kind={kind} index={index} onIndex={setIndex} onDone={() => setIndex(0)} />;
}

export const Teacher: Story = { tags: ['primary'], render: () => <Flow kind="teacher" /> };
export const Guardian: Story = { render: () => <Flow kind="guardian" /> };
export const Staff: Story = { render: () => <Flow kind="staff" /> };
