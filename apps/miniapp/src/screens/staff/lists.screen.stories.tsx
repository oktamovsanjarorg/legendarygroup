import type { Meta, StoryObj } from '@storybook/react-vite';
import { emptyAnn } from '../../data/staff-announcements.js';
import { stateStories } from '../story-kit.js';
import { AnnFormView, AnnouncementsView, AnnouncementView } from './announcements.js';
import {
  AuditItemView,
  AuditLogList,
  AuditScreen,
  StaffActivityList,
  SuspiciousList,
} from './audit.js';
import {
  activity,
  announcement,
  annStats,
  auditItem,
  suspicious,
  undeliveredItem,
} from './lists-mock.js';
import { UndeliveredView } from './undelivered.js';

const meta: Meta = { title: 'miniapp/Xodim/Aloqa va audit (MS-15, 26, 33)' };
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;

export const MS15_List: Story = {
  tags: ['primary'],
  render: () => <AnnouncementsView items={[announcement]} onOpen={noop} onAdd={noop} />,
};
export const MS15_Empty: Story = {
  render: () => <AnnouncementsView items={[]} onOpen={noop} onAdd={noop} />,
};
export const MS15_New: Story = {
  render: () => (
    <AnnFormView
      form={{ ...emptyAnn, targetId: 'g1', title: 'Ochiq dars', body: 'Ertaga 15:00 da.' }}
      groups={[{ id: 'g1', name: 'IELTS A1' }]}
      courses={[]}
      count={12}
      file={{ kind: 'empty' }}
      sending={false}
      onForm={noop}
      onPickFile={noop}
      onSend={noop}
    />
  ),
};
export const MS15_Stats: Story = { render: () => <AnnouncementView stats={annStats} /> };
const undelivered = (items: (typeof undeliveredItem)[]) => (
  <UndeliveredView items={items} filter="all" busy={false} onFilter={noop} onRetry={noop} />
);
export const MS26_List: Story = { render: () => undelivered([undeliveredItem]) };
export const MS26_Empty: Story = { render: () => undelivered([]) };
export const MS33_Log: Story = {
  render: () => (
    <AuditScreen tab="log" onTab={noop}>
      <AuditLogList
        items={[auditItem]}
        filter="all"
        hasMore
        onFilter={noop}
        onMore={noop}
        onOpen={noop}
      />
    </AuditScreen>
  ),
};
export const MS33_Suspicious: Story = {
  render: () => (
    <AuditScreen tab="suspicious" onTab={noop}>
      <SuspiciousList items={[suspicious]} />
    </AuditScreen>
  ),
};
export const MS33_Staff: Story = {
  render: () => (
    <AuditScreen tab="staff" onTab={noop}>
      <StaffActivityList items={[activity]} period="2026-11" current="2026-11" onPeriod={noop} />
    </AuditScreen>
  ),
};
export const MS33_Item: Story = { render: () => <AuditItemView item={auditItem} /> };
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
