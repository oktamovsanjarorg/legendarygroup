import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { DashboardView } from './dashboard.js';
import { KPI, LESSONS } from './mock.js';

const noop = () => undefined;
const today = LESSONS.filter((l) => l.date === '2026-11-12');
const meta: Meta = { title: 'web/F1/W-04 Bosh sahifa' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/">
      <DashboardView title={t.menu.home} k={KPI} lessons={today} onOpen={noop} />
    </WebFrame>
  ),
};
export const Offline: Story = {
  render: () => (
    <WebFrame active="/" offline>
      <DashboardView title={t.menu.home} k={KPI} lessons={today} onOpen={noop} />
    </WebFrame>
  ),
};
const states = webStates('/', t.menu.home);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
