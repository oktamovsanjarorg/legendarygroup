import type { Meta, StoryObj } from '@storybook/react-vite';
import { GUARDIAN_TABS, stateStories, TabRoot } from '../story-kit.js';
import { SCHEDULE, WEEK } from '../teacher/mock-more.js';
import { ScheduleView } from '../teacher/schedule.js';
import { AbsenceView } from './absence.js';
import { CHILD_TABS, TICKETS } from './mock.js';
import { MoreView } from './more.js';
import { TicketsView } from './tickets.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ota-ona/MG-08–11 Koʻproq' };
export default meta;
type Story = StoryObj<typeof meta>;

export const MG11_More: Story = {
  tags: ['primary'],
  render: () => (
    <TabRoot active="/more" tabs={GUARDIAN_TABS}>
      <MoreView onOpen={noop} openTickets={1} />
    </TabRoot>
  ),
};
export const MG08_Absence: Story = {
  tags: ['primary'],
  render: () => <AbsenceView childTabs={CHILD_TABS} initialChild="c1" onSend={noop} />,
};
export const MG08_Sent: Story = {
  render: () => <AbsenceView childTabs={CHILD_TABS} initialChild="c1" sent onSend={noop} />,
};
export const MG09_Tickets: Story = {
  tags: ['primary'],
  render: () => <TicketsView tickets={TICKETS} onSend={noop} />,
};
export const MG09_Empty: Story = { render: () => <TicketsView tickets={[]} onSend={noop} /> };
/** MG-10: farzand jadvali — Ustoz jadval ko'rinishi qayta ishlatiladi (o'rinbosar belgisisiz). */
export const MG10_Schedule: Story = {
  render: () => (
    <ScheduleView
      week={WEEK}
      selected="2026-11-12"
      lessons={SCHEDULE.slice(1).map((l) => ({ ...l, substituteFor: undefined }))}
      onSelect={noop}
      onOpen={noop}
    />
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
