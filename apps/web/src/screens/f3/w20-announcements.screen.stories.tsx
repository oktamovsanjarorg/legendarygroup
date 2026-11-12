import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_ANNOUNCEMENTS } from './mock-comm.js';
import { AnnouncementsView } from './w20-announcements.js';

const meta: Meta = { title: 'web/F3/W-20 Eʻlonlar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/announcements">
      <AnnouncementsView announcements={MOCK_ANNOUNCEMENTS} />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/announcements">
      <AnnouncementsView announcements={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/announcements" offline>
      <AnnouncementsView announcements={MOCK_ANNOUNCEMENTS} />
    </WebFrame>
  ),
};

const states = webStates('/announcements', t.announcements.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
