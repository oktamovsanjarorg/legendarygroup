import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_FAILED_MESSAGES } from './mock-comm.js';
import { FailedMessagesView } from './w22-failed-messages.js';

const meta: Meta = { title: 'web/F3/W-22 Yetib bormagan xabarlar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/failed-messages">
      <FailedMessagesView messages={MOCK_FAILED_MESSAGES} />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/failed-messages">
      <FailedMessagesView messages={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/failed-messages" offline>
      <FailedMessagesView messages={MOCK_FAILED_MESSAGES} />
    </WebFrame>
  ),
};

const states = webStates('/failed-messages', t.failedMessages.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
