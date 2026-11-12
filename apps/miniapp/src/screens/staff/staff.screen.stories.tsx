import type { Meta, StoryObj } from '@storybook/react-vite';
import { must, OfflineFrame, STAFF_TABS, stateStories, TabRoot } from '../story-kit.js';
import { ApprovalDecisionView, ApprovalsView } from './approvals.js';
import { StaffDashboardView } from './dashboard.js';
import { APPROVALS, GUARDIANS, KPI, QUEUE, STUDENTS } from './mock.js';
import { ReviewView } from './review.js';
import { matchStudents, SearchView } from './search.js';
import { StudentCardView } from './student-card.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Xodim/MS-01–05' };
export default meta;
type Story = StoryObj<typeof meta>;

const root = (active: string, node: React.ReactNode) => (
  <TabRoot active={active} tabs={STAFF_TABS}>
    {node}
  </TabRoot>
);
const first = must(QUEUE[0]);
const dup = must(QUEUE[1]);
const discount = must(APPROVALS[0]);
const student = must(STUDENTS[0]);

export const MS01_Director: Story = {
  tags: ['primary'],
  render: () => root('/', <StaffDashboardView k={KPI} onOpen={noop} />),
};
/** Admin: "So'rovlar" plitkasi yo'q. */
export const MS01_Admin: Story = {
  render: () =>
    root('/', <StaffDashboardView k={{ ...KPI, approvals: undefined }} onOpen={noop} />),
};
export const MS01_Offline: Story = {
  render: () => (
    <OfflineFrame>{root('/', <StaffDashboardView k={KPI} onOpen={noop} />)}</OfflineFrame>
  ),
};
/** FR-PAY-4: ≤ 3 teginish — bildirishnoma → ochish → Tasdiqlash. */
export const MS02_Review: Story = {
  tags: ['primary'],
  render: () => <ReviewView item={first} position={1} total={3} onApprove={noop} onReject={noop} />,
};
export const MS02_Duplicate: Story = {
  render: () => <ReviewView item={dup} position={2} total={3} onApprove={noop} onReject={noop} />,
};
export const MS02_Locked: Story = {
  render: () => (
    <ReviewView
      item={{ ...first, lockedBy: 'Rahimova Gulnoza' }}
      position={1}
      total={3}
      onApprove={noop}
      onReject={noop}
    />
  ),
};
export const MS02_Empty: Story = {
  render: () =>
    root(
      '/queue',
      <ReviewView item={null} position={0} total={0} onApprove={noop} onReject={noop} />,
    ),
};
export const MS03_List: Story = {
  tags: ['primary'],
  render: () => root('/approvals', <ApprovalsView items={APPROVALS} onOpen={noop} />),
};
export const MS03_Decision: Story = {
  tags: ['primary'],
  render: () => <ApprovalDecisionView r={discount} onApprove={noop} onReject={noop} />,
};
export const MS03_Empty: Story = {
  render: () => root('/approvals', <ApprovalsView items={[]} onOpen={noop} />),
};
export const MS04_Results: Story = {
  tags: ['primary'],
  render: () =>
    root(
      '/search',
      <SearchView
        query="ali"
        results={matchStudents('ali', STUDENTS)}
        onQuery={noop}
        onOpen={noop}
      />,
    ),
};
export const MS04_Start: Story = {
  render: () => root('/search', <SearchView query="" results={[]} onQuery={noop} onOpen={noop} />),
};
export const MS04_NotFound: Story = {
  render: () =>
    root('/search', <SearchView query="Rustamov" results={[]} onQuery={noop} onOpen={noop} />),
};
export const MS05_Card: Story = {
  tags: ['primary'],
  render: () => <StudentCardView s={student} guardians={GUARDIANS} />,
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
