import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { AttendanceGridView } from './attendance-grid.js';
import { CalendarView } from './calendar.js';
import { CoursesView } from './courses.js';
import { GroupsView } from './groups.js';
import { LeadsView } from './leads.js';
import { LinkRequestsView } from './link-requests.js';
import { COURSES, GRID, GROUP_ROWS, LEADS, LESSONS, LINK_REQUESTS, ROOMS } from './mock.js';

const noop = () => undefined;
const meta: Meta = { title: 'web/F1/W-07–12 Tashkiliy' };
export default meta;
type Story = StoryObj<typeof meta>;

const frame = (active: string, node: React.ReactNode) => (
  <WebFrame active={active}>{node}</WebFrame>
);
const WEEK = [9, 10, 11, 12, 13, 14, 15].map((date) => ({
  date,
  holiday: undefined as string | undefined,
}));

export const W07_LinkRequests: Story = {
  tags: ['primary'],
  render: () =>
    frame(
      '/link-requests',
      <LinkRequestsView rows={LINK_REQUESTS} onLink={noop} onReject={noop} />,
    ),
};
export const W07_Empty: Story = {
  render: () =>
    frame('/link-requests', <LinkRequestsView rows={[]} onLink={noop} onReject={noop} />),
};
export const W08_Leads: Story = {
  tags: ['primary'],
  render: () => frame('/leads', <LeadsView leads={LEADS} onConvert={noop} onNew={noop} />),
};
export const W09_Courses: Story = {
  tags: ['primary'],
  render: () =>
    frame(
      '/courses',
      <CoursesView tab="courses" courses={COURSES} rooms={ROOMS} onTab={noop} onAdd={noop} />,
    ),
};
export const W09_Rooms: Story = {
  render: () =>
    frame(
      '/courses',
      <CoursesView tab="rooms" courses={COURSES} rooms={ROOMS} onTab={noop} onAdd={noop} />,
    ),
};
export const W10_Groups: Story = {
  tags: ['primary'],
  render: () =>
    frame(
      '/groups',
      <GroupsView rows={GROUP_ROWS} formOpen={false} onNew={noop} onClose={noop} onOpen={noop} />,
    ),
};
/** FR-ORG-6: xona to'qnashuvi saqlashdan oldin ko'rinadi. */
export const W10_FormConflict: Story = {
  render: () =>
    frame(
      '/groups',
      <GroupsView
        rows={GROUP_ROWS}
        formOpen
        conflict={t.groups.conflict
          .replace('{room}', '204-xona')
          .replace('{time}', 'Du 15:00')
          .replace('{group}', 'IELTS 7.0 — B2-guruh')}
        onNew={noop}
        onClose={noop}
        onOpen={noop}
      />,
    ),
};
export const W11_Week: Story = {
  tags: ['primary'],
  render: () =>
    frame(
      '/calendar',
      <CalendarView
        weekTitle="9–15-noyabr, 2026"
        days={WEEK}
        lessons={LESSONS}
        todayIndex={3}
        onLesson={noop}
      />,
    ),
};
export const W12_Grid: Story = {
  tags: ['primary'],
  render: () => frame('/attendance', <AttendanceGridView g={GRID} onGroup={noop} onCell={noop} />),
};
const states = webStates('/groups', t.groups.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
