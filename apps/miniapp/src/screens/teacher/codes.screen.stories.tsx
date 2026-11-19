import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineFrame, stateStories } from '../story-kit.js';
import { CODE_ROWS } from './codes-mock.js';
import { CodesView } from './codes.js';

const noop = () => undefined;
const group = 'Matematika — 7-sinf A';
const meta: Meta = { title: 'miniapp/Ustoz/MT-05a Oʻquvchi kodlari' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => <CodesView groupName={group} rows={CODE_ROWS} onSave={noop} />,
};
export const Saving: Story = {
  render: () => <CodesView groupName={group} rows={CODE_ROWS} saving onSave={noop} />,
};
export const Saved: Story = {
  render: () => <CodesView groupName={group} rows={CODE_ROWS} saved onSave={noop} />,
};
export const CodeTaken: Story = {
  render: () => (
    <CodesView
      groupName={group}
      rows={CODE_ROWS}
      error="Bu raqam boshqa oʻquvchiga berilgan. Boshqa raqam kiriting."
      onSave={noop}
    />
  ),
};
export const Empty: Story = {
  render: () => <CodesView groupName={group} rows={[]} onSave={noop} />,
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Offline: Story = {
  render: () => (
    <OfflineFrame>
      <CodesView groupName={group} rows={CODE_ROWS} onSave={noop} />
    </OfflineFrame>
  ),
};
export const Forbidden: Story = stateStories.Forbidden;
