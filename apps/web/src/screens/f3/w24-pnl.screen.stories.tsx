import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_PNL_MONTHS } from './mock-finance.js';
import { PnlView } from './w24-pnl.js';

const meta: Meta = { title: 'web/F3/W-24 P&L' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/finance">
      <PnlView months={MOCK_PNL_MONTHS} />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/finance">
      <PnlView months={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/finance" offline>
      <PnlView months={MOCK_PNL_MONTHS} />
    </WebFrame>
  ),
};

const states = webStates('/finance', t.pnl.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
