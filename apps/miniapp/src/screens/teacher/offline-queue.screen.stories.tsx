import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories } from '../story-kit.js';
import { OfflineQueueView } from './offline-queue.js';

const at = (hhmm: string) => new Date(`2026-11-12T${hhmm}:00+05:00`);
const ITEMS = [
  {
    id: 'q1',
    groupName: 'IELTS 7.0 — B2-guruh',
    lessonAt: at('15:00'),
    lastAttemptAt: at('16:41'),
  },
  { id: 'q2', groupName: 'Matematika — A3', lessonAt: at('11:00'), lastAttemptAt: at('16:41') },
];
const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ustoz/MT-03 Offline navbat' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <OfflineFrame>
      <OfflineQueueView items={ITEMS} onSendNow={noop} />
    </OfflineFrame>
  ),
};
export const Sending: Story = {
  render: () => <OfflineQueueView items={ITEMS} sending onSendNow={noop} />,
};
export const Empty: Story = { render: () => <OfflineQueueView items={[]} onSendNow={noop} /> };
// CSF indekseri destrukturlashni tanimaydi — har holat alohida eksport.
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
