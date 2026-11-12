import type { Meta, StoryObj } from '@storybook/react-vite';
import { stateStories } from '../story-kit.js';
import { FeedbackView } from './feedback.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Umumiy/C-05 Fikr-mulohaza' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => <FeedbackView onAttach={noop} onSend={noop} />,
};
export const WithScreenshot: Story = {
  render: () => (
    <FeedbackView screenshotName="ekran-2026-11-12.png" onAttach={noop} onSend={noop} />
  ),
};
export const Sent: Story = { render: () => <FeedbackView sent onAttach={noop} onSend={noop} /> };
export const Error: Story = stateStories.Error;
