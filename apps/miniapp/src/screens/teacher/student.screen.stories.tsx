import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories } from '../story-kit.js';
import { CommentComposer } from './comment-composer.js';
import { PROFILE } from './mock-more.js';
import { StudentView } from './student.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ustoz/MT-06 Oʻquvchi profili' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => <StudentView profile={PROFILE} canComment onAddComment={noop} />,
};
/** Yordamchi ustoz: izoh yozolmaydi (Q-62) — MainButton yo'q. */
export const Assistant: Story = {
  render: () => <StudentView profile={PROFILE} canComment={false} onAddComment={noop} />,
};
export const Empty: Story = {
  render: () => (
    <StudentView
      profile={{ ...PROFILE, grades: [], comments: [], month: { ...PROFILE.month, marks: {} } }}
      canComment
      onAddComment={noop}
    />
  ),
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <StudentView profile={PROFILE} canComment onAddComment={noop} />
    </OfflineFrame>
  ),
};
export const CommentComposerScreen: Story = {
  render: () => <CommentComposer studentName={PROFILE.name} onSave={noop} />,
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
