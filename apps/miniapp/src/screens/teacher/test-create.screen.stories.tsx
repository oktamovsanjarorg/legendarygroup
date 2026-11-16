import type { Meta, StoryObj } from '@storybook/react-vite';
import { stateStories } from '../story-kit.js';
import { TestCreateView } from './test-create.js';

const noop = () => undefined;
const group = 'IELTS 7.0 — B2-guruh';
const meta: Meta = { title: 'miniapp/Ustoz/MT-07a Test yaratish' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => <TestCreateView groupName={group} defaultDate="2026-11-16" onSubmit={noop} />,
};
export const Creating: Story = {
  render: () => (
    <TestCreateView groupName={group} defaultDate="2026-11-16" creating onSubmit={noop} />
  ),
};
export const ServerError: Story = {
  render: () => (
    <TestCreateView
      groupName={group}
      defaultDate="2026-11-16"
      error="Internet bilan aloqa yoʻq. Qaytadan urinib koʻring."
      onSubmit={noop}
    />
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
