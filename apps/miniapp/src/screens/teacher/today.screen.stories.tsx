import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories, TabRoot } from '../story-kit.js';
import { TODAY } from './mock.js';
import { TodayView } from './today.js';

const noop = () => undefined;
const meta: Meta = {
  title: 'miniapp/Ustoz/MT-01 Bugun',
  decorators: [
    (Story) => (
      <TabRoot active="/">
        <Story />
      </TabRoot>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TodayView lessons={TODAY} onOpen={noop} onSchedule={noop} />,
};
export const AllMarked: Story = {
  render: () => (
    <TodayView
      lessons={TODAY.filter((l) => l.state.kind !== 'unmarked')}
      onOpen={noop}
      onSchedule={noop}
    />
  ),
};
export const Empty: Story = {
  render: () => <TodayView lessons={[]} onOpen={noop} onSchedule={noop} />,
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <TodayView lessons={TODAY} onOpen={noop} onSchedule={noop} />
    </OfflineFrame>
  ),
};
// CSF indekseri destrukturlashni tanimaydi — har holat alohida eksport.
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
