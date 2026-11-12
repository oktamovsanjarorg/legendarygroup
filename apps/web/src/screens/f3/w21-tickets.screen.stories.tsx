import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_TICKETS } from './mock-comm.js';
import { TicketsView } from './w21-tickets.js';

const meta: Meta = { title: 'web/F3/W-21 Murojaatlar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/tickets">
      <TicketsView tickets={MOCK_TICKETS} />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/tickets">
      <TicketsView tickets={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/tickets" offline>
      <TicketsView tickets={MOCK_TICKETS} />
    </WebFrame>
  ),
};

const states = webStates('/tickets', t.tickets.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
