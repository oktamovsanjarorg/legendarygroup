import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, STUDENT_TABS, stateStories, TabRoot } from '../story-kit.js';
import { NO_TESTS, PROGRESS } from './mock.js';
import { StudentResultsView } from './results.js';

const meta: Meta = {
  title: 'miniapp/Oʻquvchi/M-STU-03 Natijalar',
  decorators: [
    (Story) => (
      <TabRoot active="/results" tabs={STUDENT_TABS}>
        <Story />
      </TabRoot>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Guruhdagi oʻrin, baholar dinamikasi va testlar (D4). */
export const Default: Story = {
  tags: ['primary'],
  render: () => <StudentResultsView tests={NO_TESTS} progress={PROGRESS} />,
};
export const Empty: Story = {
  render: () => <StudentResultsView tests={NO_TESTS} progress={null} />,
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <StudentResultsView tests={NO_TESTS} progress={PROGRESS} />
    </OfflineFrame>
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
