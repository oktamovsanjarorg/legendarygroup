import { ROLE_PERMISSIONS, type SessionInfo } from '@lg/contracts';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelpView, SessionsView } from './help.js';

const meta: Meta = { title: 'miniapp/Xodim/MS-34 Yordam va sessiyalar' };
export default meta;
type Story = StoryObj<typeof meta>;

const sessions: SessionInfo[] = [
  {
    id: '1',
    device: 'Chrome · Windows',
    ip: '203.0.113.5',
    createdAt: '2026-11-20T05:00:00.000Z',
    current: false,
  },
  { id: '2', device: null, ip: null, createdAt: '2026-11-21T05:00:00.000Z', current: false },
];
const noop = () => undefined;

export const MS34_Director: Story = {
  render: () => <HelpView permissions={ROLE_PERMISSIONS.director} />,
};
export const MS34_Admin: Story = {
  render: () => <HelpView permissions={ROLE_PERMISSIONS.admin} />,
};
export const MS34a_Sessions: Story = {
  render: () => <SessionsView items={sessions} busy={false} onEnd={noop} />,
};
export const MS34a_Empty: Story = {
  render: () => <SessionsView items={[]} busy={false} onEnd={noop} />,
};
