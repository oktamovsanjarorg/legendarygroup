import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories, TabRoot } from '../story-kit.js';
import { SCHEDULE, WEEK } from './mock-more.js';
import { ScheduleView } from './schedule.js';

const noop = () => undefined;
const meta: Meta = {
  title: 'miniapp/Ustoz/MT-09 Jadval',
  decorators: [
    (Story) => (
      <TabRoot active="/schedule">
        <Story />
      </TabRoot>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <ScheduleView
      week={WEEK}
      selected="2026-11-12"
      lessons={SCHEDULE}
      onSelect={noop}
      onOpen={noop}
    />
  ),
};
export const EmptyDay: Story = {
  render: () => (
    <ScheduleView week={WEEK} selected="2026-11-15" lessons={[]} onSelect={noop} onOpen={noop} />
  ),
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <ScheduleView
        week={WEEK}
        selected="2026-11-12"
        lessons={SCHEDULE}
        onSelect={noop}
        onOpen={noop}
      />
    </OfflineFrame>
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
