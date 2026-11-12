import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories } from '../story-kit.js';
import { AttendanceView } from './attendance.js';
import { LESSON, LONG_ROSTER, QUIET_UNTIL, ROSTER } from './mock.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Ustoz/MT-02 Davomat' };
export default meta;
type Story = StoryObj<typeof meta>;

/** Ochilganda: hamma "keldi", oldindan sababli belgili; MainButton "Saqlash (19/20 keldi)". */
export const Default: Story = {
  render: () => <AttendanceView lesson={LESSON} students={ROSTER} onSave={noop} />,
};

/** 2 kelmagan, 1 kech — 11-ux §5 ssenariysi. */
export const TwoAbsent: Story = {
  render: () => (
    <AttendanceView
      lesson={LESSON}
      students={ROSTER}
      draft={{ s2: { kind: 'absent' }, s5: { kind: 'absent' }, s9: { kind: 'late', minutes: 15 } }}
      onSave={noop}
    />
  ),
};
export const Saving: Story = {
  render: () => <AttendanceView lesson={LESSON} students={ROSTER} saving onSave={noop} />,
};

/** BR-31: saqlandi, 3 daqiqalik tuzatish oynasi. */
export const SavedQuietWindow: Story = {
  render: () => (
    <AttendanceView
      lesson={LESSON}
      students={ROSTER}
      saved={{ s2: { kind: 'absent' } }}
      quietUntil={QUIET_UNTIL}
      onSave={noop}
    />
  ),
};
export const SavedOffline: Story = {
  render: () => (
    <OfflineFrame>
      <AttendanceView
        lesson={LESSON}
        students={ROSTER}
        saved={{ s2: { kind: 'absent' } }}
        queuedOffline
        onSave={noop}
      />
    </OfflineFrame>
  ),
};
export const LongNames: Story = {
  render: () => <AttendanceView lesson={LESSON} students={LONG_ROSTER} onSave={noop} />,
};
export const Empty: Story = {
  render: () => <AttendanceView lesson={LESSON} students={[]} onSave={noop} />,
};
// CSF indekseri destrukturlashni tanimaydi — har holat alohida eksport.
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
