import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_PAYROLL_LIST } from './mock-finance.js';
import { PayrollView } from './w25-payroll.js';

const meta: Meta = { title: 'web/F3/W-25 Oyliklar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/finance">
      <PayrollView items={MOCK_PAYROLL_LIST} />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/finance">
      <PayrollView items={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/finance" offline>
      <PayrollView items={MOCK_PAYROLL_LIST} />
    </WebFrame>
  ),
};

const states = webStates('/finance', t.payroll.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
