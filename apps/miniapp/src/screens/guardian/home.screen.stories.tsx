import type { Meta, StoryObj } from '@storybook/react-vite';
import { GUARDIAN_TABS, OfflineFrame, stateStories, TabRoot } from '../story-kit.js';
import { GuardianHomeView } from './home.js';
import { CHILDREN } from './mock.js';

const noop = () => undefined;
const first = CHILDREN[0] ?? { id: 'x', name: '—', today: { kind: 'none' as const }, debt: 0n };
const meta: Meta = {
  title: 'miniapp/Ota-ona/MG-01 Asosiy',
  decorators: [
    (Story) => (
      <TabRoot active="/" tabs={GUARDIAN_TABS}>
        <Story />
      </TabRoot>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Ikki farzand, birinchisida qarz — MainButton "To'lash". */
export const Default: Story = {
  tags: ['primary'],
  render: () => <GuardianHomeView items={CHILDREN} selected="c1" onSelect={noop} onPay={noop} />,
};
/** Ikkinchi farzand: avans, dars hali boshlanmagan. */
export const SecondChildAdvance: Story = {
  render: () => <GuardianHomeView items={CHILDREN} selected="c2" onSelect={noop} onPay={noop} />,
};
export const SingleChildAbsent: Story = {
  render: () => (
    <GuardianHomeView
      items={[{ ...first, today: { kind: 'absent' }, debt: 0n }]}
      selected="c1"
      onSelect={noop}
      onPay={noop}
    />
  ),
};
export const LateToday: Story = {
  render: () => (
    <GuardianHomeView
      items={[{ ...first, today: { kind: 'late', minutes: 20 } }]}
      selected="c1"
      onSelect={noop}
      onPay={noop}
    />
  ),
};
export const Empty: Story = {
  render: () => <GuardianHomeView items={[]} selected="" onSelect={noop} onPay={noop} />,
};
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <GuardianHomeView items={CHILDREN} selected="c1" onSelect={noop} onPay={noop} />
    </OfflineFrame>
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
