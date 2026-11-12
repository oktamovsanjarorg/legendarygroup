import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_EXPENSES } from './mock-finance.js';
import { ExpensesView } from './w23-expenses.js';

const meta: Meta = { title: 'web/F3/W-23 Xarajatlar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/finance">
      <ExpensesView expenses={MOCK_EXPENSES} />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/finance">
      <ExpensesView expenses={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/finance" offline>
      <ExpensesView expenses={MOCK_EXPENSES} />
    </WebFrame>
  ),
};

const states = webStates('/finance', t.expenses.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
