import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_PAYROLL_LIST, MOCK_PAYROLL_TOTAL } from './mock-finance.js';
import { PayrollView } from './w25-payroll.js';

const noop = () => undefined;

const meta: Meta = { title: 'web/F3/W-25 Oyliklar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/finance">
      <PayrollView
        periodLabel="noyabr, 2026"
        status="draft"
        rows={MOCK_PAYROLL_LIST}
        total={MOCK_PAYROLL_TOTAL}
        onGenerate={noop}
        onApprove={noop}
      />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/finance">
      <PayrollView
        periodLabel="noyabr, 2026"
        status={null}
        rows={[]}
        total={0n}
        onGenerate={noop}
      />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/finance" offline>
      <PayrollView
        periodLabel="noyabr, 2026"
        status="draft"
        rows={MOCK_PAYROLL_LIST}
        total={MOCK_PAYROLL_TOTAL}
        onGenerate={noop}
        onApprove={noop}
      />
    </WebFrame>
  ),
};

const states = webStates('/finance', t.payroll.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
