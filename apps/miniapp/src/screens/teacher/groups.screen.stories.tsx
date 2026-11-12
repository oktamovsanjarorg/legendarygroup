import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories, TabRoot } from '../story-kit.js';
import { GroupView } from './group.js';
import { GroupsView } from './groups.js';
import { GROUP_STUDENTS, GROUPS } from './mock.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ustoz/MT-04–05 Guruhlar' };
export default meta;
type Story = StoryObj<typeof meta>;

const main = GROUPS[0] ?? {
  id: 'g',
  name: 'Guruh',
  courseName: 'Kurs',
  studentCount: 0,
  role: 'main' as const,
};
const assistant = GROUPS[2] ?? main;

export const MT04_List: Story = {
  render: () => (
    <TabRoot active="/groups">
      <GroupsView groups={GROUPS} onOpen={noop} />
    </TabRoot>
  ),
};
export const MT04_Empty: Story = {
  render: () => (
    <TabRoot active="/groups">
      <GroupsView groups={[]} onOpen={noop} />
    </TabRoot>
  ),
};
export const MT04_Offline: Story = {
  render: () => (
    <OfflineFrame>
      <GroupsView groups={GROUPS} onOpen={noop} />
    </OfflineFrame>
  ),
};
export const MT05_MainTeacher: Story = {
  render: () => (
    <GroupView
      group={main}
      students={GROUP_STUDENTS}
      onStudent={noop}
      onTests={noop}
      onAnnounce={noop}
    />
  ),
};
/** Yordamchi ustozda e'lon yo'q (MT-10 — faqat main). */
export const MT05_Assistant: Story = {
  render: () => (
    <GroupView
      group={assistant}
      students={GROUP_STUDENTS}
      onStudent={noop}
      onTests={noop}
      onAnnounce={noop}
    />
  ),
};
export const MT05_Empty: Story = {
  render: () => <GroupView group={main} students={[]} onStudent={noop} onTests={noop} />,
};
// CSF indekseri destrukturlashni tanimaydi — har holat alohida eksport.
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
