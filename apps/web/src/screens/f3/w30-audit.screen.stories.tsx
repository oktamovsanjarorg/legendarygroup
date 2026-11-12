import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import {
  MOCK_AUDIT_LOGS,
  MOCK_STAFF_ACTIVITIES,
  MOCK_SUSPICIOUS_ACTIVITIES,
} from './mock-analytics.js';
import { AuditView } from './w30-audit.js';

const meta: Meta = { title: 'web/F3/W-30 Audit' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/audit">
      <AuditView
        logs={MOCK_AUDIT_LOGS}
        suspicious={MOCK_SUSPICIOUS_ACTIVITIES}
        staffActivity={MOCK_STAFF_ACTIVITIES}
      />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/audit">
      <AuditView logs={[]} suspicious={[]} staffActivity={[]} />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/audit" offline>
      <AuditView
        logs={MOCK_AUDIT_LOGS}
        suspicious={MOCK_SUSPICIOUS_ACTIVITIES}
        staffActivity={MOCK_STAFF_ACTIVITIES}
      />
    </WebFrame>
  ),
};

const states = webStates('/audit', t.audit.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
