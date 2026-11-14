import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import {
  MOCK_REPORT_AGING,
  MOCK_REPORT_ATTENDANCE,
  MOCK_REPORT_CONVERSION,
  MOCK_REPORT_REVENUE,
  MOCK_REPORT_TEACHERS,
} from './mock-analytics.js';
import { ReportsView } from './w26-reports.js';

const meta: Meta = { title: 'web/F3/W-26 Hisobotlar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/reports">
      <ReportsView
        revenueData={MOCK_REPORT_REVENUE}
        agingData={MOCK_REPORT_AGING}
        attendanceData={MOCK_REPORT_ATTENDANCE}
        conversionData={MOCK_REPORT_CONVERSION}
        teacherData={MOCK_REPORT_TEACHERS}
      />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/reports">
      <ReportsView
        revenueData={[]}
        agingData={[]}
        attendanceData={[]}
        conversionData={[]}
        teacherData={[]}
      />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/reports" offline>
      <ReportsView
        revenueData={MOCK_REPORT_REVENUE}
        agingData={MOCK_REPORT_AGING}
        attendanceData={MOCK_REPORT_ATTENDANCE}
        conversionData={MOCK_REPORT_CONVERSION}
        teacherData={MOCK_REPORT_TEACHERS}
      />
    </WebFrame>
  ),
};

const states = webStates('/reports', t.reports.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
