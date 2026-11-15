import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_ANNOUNCEMENTS } from './mock-comm.js';
import { AnnouncementFormDrawer } from './w20-announcement-form.js';
import { AnnouncementsView } from './w20-announcements.js';

const meta: Meta = { title: 'web/F3/W-20 Eʼlonlar' };
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/announcements">
      <AnnouncementsView announcements={MOCK_ANNOUNCEMENTS} onNew={noop} />
    </WebFrame>
  ),
};

export const NewForm: Story = {
  render: () => (
    <WebFrame active="/announcements">
      <AnnouncementsView
        announcements={MOCK_ANNOUNCEMENTS}
        onNew={noop}
        form={
          <AnnouncementFormDrawer
            courses={[{ value: 'c1', label: 'Matematika' }]}
            groups={[{ value: 'g1', label: 'MAT-1' }]}
            recipients={134}
            onAudience={noop}
            onSend={noop}
            onClose={noop}
          />
        }
      />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/announcements">
      <AnnouncementsView announcements={[]} onNew={noop} />
    </WebFrame>
  ),
};

const states = webStates('/announcements', t.announcements.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
