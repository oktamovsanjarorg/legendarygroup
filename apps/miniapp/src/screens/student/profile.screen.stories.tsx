import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, STUDENT_TABS, stateStories, TabRoot } from '../story-kit.js';
import { STUDENT } from './mock.js';
import { StudentProfileView } from './profile.js';

const noop = () => undefined;
const meta: Meta = {
  title: 'miniapp/Oʻquvchi/M-STU-04 Profil',
  decorators: [
    (Story) => (
      <TabRoot active="/profile" tabs={STUDENT_TABS}>
        <Story />
      </TabRoot>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => <StudentProfileView student={STUDENT} onSettings={noop} />,
};
/** Guruhga hali yozilmagan. */
export const Empty: Story = {
  render: () => <StudentProfileView student={{ ...STUDENT, groups: [] }} onSettings={noop} />,
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <StudentProfileView student={STUDENT} onSettings={noop} />
    </OfflineFrame>
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
