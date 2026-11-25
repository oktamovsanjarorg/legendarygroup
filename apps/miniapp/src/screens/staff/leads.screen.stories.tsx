import type { Meta, StoryObj } from '@storybook/react-vite';
import { leadForm } from '../../data/staff-leads.js';
import { stateStories } from '../story-kit.js';
import { LeadFormView, LeadTrialView, ReasonView } from './lead-forms.js';
import { LeadsView, LeadView } from './leads.js';
import { lead, lesson } from './lists-mock.js';

const meta: Meta = { title: 'miniapp/Xodim/MS-09 Lidlar' };
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;

const list = (items: (typeof lead)[]) => (
  <LeadsView
    items={items}
    status="new"
    query=""
    summary="Shu oy: 12 ta lid, oʻquvchi boʻldi — 25%"
    onStatus={noop}
    onQuery={noop}
    onOpen={noop}
    onAdd={noop}
  />
);
export const List: Story = { tags: ['primary'], render: () => list([lead]) };
export const Empty: Story = { render: () => list([]) };
export const Card: Story = {
  render: () => (
    <LeadView
      lead={lead}
      busy={false}
      onStatus={noop}
      onLost={noop}
      onTrial={noop}
      onConvert={noop}
      onEdit={noop}
      onStudent={noop}
    />
  ),
};
export const Form: Story = {
  render: () => (
    <LeadFormView
      title="Yangi lid"
      form={leadForm(lead)}
      courses={[{ id: 'c1', name: 'Ingliz tili' }]}
      saving={false}
      onForm={noop}
      onSave={noop}
    />
  ),
};
export const Lost: Story = {
  render: () => (
    <ReasonView title="Rad etdi" label="Sabab" action="Saqlash" saving={false} onSave={noop} />
  ),
};
export const Trial: Story = {
  render: () => (
    <LeadTrialView
      groups={[{ id: 'g1', name: 'IELTS A1' }]}
      groupId="g1"
      lessons={[lesson]}
      lessonId="les1"
      saving={false}
      onGroup={noop}
      onLesson={noop}
      onSave={noop}
    />
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
