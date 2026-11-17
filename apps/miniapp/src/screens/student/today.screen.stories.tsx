import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, STUDENT_TABS, stateStories, TabRoot } from '../story-kit.js';
import { LESSON } from './mock.js';
import { StudentTodayView } from './today.js';

const meta: Meta = {
  title: 'miniapp/Oʻquvchi/M-STU-01 Bugun',
  decorators: [
    (Story) => (
      <TabRoot active="/" tabs={STUDENT_TABS}>
        <Story />
      </TabRoot>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Bugun dars bor, hali boshlanmagan. */
export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <StudentTodayView
      studentName="Anvar"
      todayStatus={{ kind: 'pending', at: new Date('2026-11-18T14:00:00+05:00') }}
      todayLessons={[LESSON]}
    />
  ),
};
export const Present: Story = {
  render: () => (
    <StudentTodayView
      studentName="Anvar"
      todayStatus={{ kind: 'present' }}
      todayLessons={[LESSON]}
    />
  ),
};
/** Bugun dars yoʻq — keyingi dars koʻrsatiladi. */
export const Empty: Story = {
  render: () => (
    <StudentTodayView
      studentName="Anvar"
      todayStatus={{ kind: 'none' }}
      todayLessons={[]}
      nextLesson={{ ...LESSON, date: '2026-11-20' }}
    />
  ),
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <StudentTodayView
        studentName="Anvar"
        todayStatus={{ kind: 'present' }}
        todayLessons={[LESSON]}
      />
    </OfflineFrame>
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
