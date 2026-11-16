import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelpView } from '../../routes/help/index.js';
import { WebFrame } from '../story-kit.js';

const ALL_PERMISSIONS = new Set([
  'staff.manage',
  'course.manage',
  'group.view',
  'student.view',
  'payment.create',
  'approval.decide',
  'payroll.manage',
  'stats.operational',
  'announcement.send',
  'settings.manage',
]);

const meta: Meta = { title: 'web/F3/W-36 Help' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/help">
      <HelpView permissions={ALL_PERMISSIONS} />
    </WebFrame>
  ),
};

export const AdminView: Story = {
  render: () => (
    <WebFrame active="/help">
      <HelpView permissions={new Set(['group.view', 'student.view', 'payment.create'])} />
    </WebFrame>
  ),
};
