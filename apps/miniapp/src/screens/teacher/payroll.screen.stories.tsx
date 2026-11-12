import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories, TabRoot } from '../story-kit.js';
import { MONTHS, PAYROLL_DETAIL } from './mock-more.js';
import { PayrollDetailView, PayrollView } from './payroll.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ustoz/MT-11 Profil va oylik' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <TabRoot active="/profile">
      <PayrollView months={MONTHS} onOpen={noop} onSettings={noop} />
    </TabRoot>
  ),
};
export const Empty: Story = {
  render: () => (
    <TabRoot active="/profile">
      <PayrollView months={[]} onOpen={noop} onSettings={noop} />
    </TabRoot>
  ),
};
/** FR-SAL-3 tafsilot; Q-33: o'quvchi ismi + summa. */
export const MonthDetail: Story = {
  tags: ['primary'],
  render: () => <PayrollDetailView d={PAYROLL_DETAIL} />,
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <PayrollView months={MONTHS} onOpen={noop} onSettings={noop} />
    </OfflineFrame>
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
