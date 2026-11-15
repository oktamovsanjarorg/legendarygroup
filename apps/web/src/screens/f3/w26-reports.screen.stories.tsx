import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_REPORT_AGING, MOCK_REPORT_KPI, MOCK_REPORT_REVENUE } from './mock-analytics.js';
import { type ReportTab, ReportsView } from './w26-reports.js';

const meta: Meta = { title: 'web/F3/W-26 Hisobotlar' };
export default meta;
type Story = StoryObj<typeof meta>;

const TABS: readonly ReportTab[] = ['revenue', 'aging', 'attendance', 'conversion', 'teachers'];
const noop = () => undefined;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/reports">
      <ReportsView
        tabs={TABS}
        tab="revenue"
        onTab={noop}
        data={{ tab: 'revenue', rows: MOCK_REPORT_REVENUE }}
        kpi={MOCK_REPORT_KPI}
        onExport={noop}
      />
    </WebFrame>
  ),
};

export const Aging: Story = {
  render: () => (
    <WebFrame active="/reports">
      <ReportsView
        tabs={TABS}
        tab="aging"
        onTab={noop}
        data={{ tab: 'aging', rows: MOCK_REPORT_AGING }}
        kpi={MOCK_REPORT_KPI}
        onExport={noop}
      />
    </WebFrame>
  ),
};

/** Admin: finance.view yoʻq — moliya tablari va KPI yoʻq. */
export const WithoutFinance: Story = {
  render: () => (
    <WebFrame active="/reports">
      <ReportsView
        tabs={['attendance', 'conversion', 'teachers']}
        tab="attendance"
        onTab={noop}
        data={{ tab: 'attendance', rows: [] }}
        kpi={{ ...MOCK_REPORT_KPI, revenue: null, debtors: null }}
        onExport={noop}
      />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/reports" offline>
      <ReportsView
        tabs={TABS}
        tab="revenue"
        onTab={noop}
        data={{ tab: 'revenue', rows: MOCK_REPORT_REVENUE }}
        kpi={MOCK_REPORT_KPI}
      />
    </WebFrame>
  ),
};

const states = webStates('/reports', t.reports.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
