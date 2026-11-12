import type { Meta, StoryObj } from '@storybook/react-vite';
import { stateStories } from '../story-kit.js';
import { AnnounceView } from './announce.js';

const noop = () => undefined;
const group = 'IELTS 7.0 — B2-guruh';
const DRAFT =
  'Hurmatli ota-onalar! Ertaga (13-noyabr) dars 16:00 da boshlanadi. Mock imtihon natijalari juma kuni eʼlon qilinadi.';
const meta: Meta = { title: 'miniapp/Ustoz/MT-10 Eʼlon yuborish' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => <AnnounceView groupName={group} recipients={20} onAttach={noop} onSend={noop} />,
};
/** Matn va fayl bilan — oldindan ko'rish. */
export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <AnnounceView
      groupName={group}
      recipients={20}
      draft={DRAFT}
      fileName="jadval-noyabr.pdf"
      onAttach={noop}
      onSend={noop}
    />
  ),
};
export const Sending: Story = {
  render: () => (
    <AnnounceView
      groupName={group}
      recipients={20}
      draft={DRAFT}
      sending
      onAttach={noop}
      onSend={noop}
    />
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
