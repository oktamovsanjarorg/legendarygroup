import { REPORT_TYPES } from '@lg/contracts';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { reportViews } from '../../data/staff-reports.js';
import { ForecastsView } from './forecasts.js';
import { attendanceReport, debtReport, forecasts, revenueReport } from './reports-mock.js';
import { ReportDetailView, ReportsMenuView } from './reports.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Xodim/MS-29, MS-30 Hisobot va prognoz' };
export default meta;
type Story = StoryObj<typeof meta>;

const common = { sending: false, onSend: noop, onStudent: noop, onGroupBy: noop };

export const MS29_Menu: Story = {
  render: () => <ReportsMenuView types={REPORT_TYPES} onOpen={noop} />,
};
export const MS29_Revenue: Story = {
  render: () => (
    <ReportDetailView
      {...common}
      type="revenue"
      view={reportViews.revenueView(revenueReport)}
      groups={['month', 'course', 'group', 'teacher']}
      groupBy="month"
      period={null}
    />
  ),
};
export const MS29_Debt: Story = {
  render: () => (
    <ReportDetailView
      {...common}
      type="debt-aging"
      view={reportViews.debtView(debtReport)}
      groups={[]}
      groupBy={null}
      period={null}
    />
  ),
};
export const MS29_Attendance: Story = {
  render: () => (
    <ReportDetailView
      {...common}
      type="attendance"
      view={reportViews.attendanceView(attendanceReport)}
      groups={['group', 'teacher']}
      groupBy="group"
      period={{ value: '2026-11', current: '2026-11', onStep: noop }}
    />
  ),
};
export const MS30_Forecasts: Story = {
  render: () => <ForecastsView data={forecasts} onStudent={noop} />,
};
export const MS30_Admin: Story = {
  render: () => (
    <ForecastsView data={{ ...forecasts, revenue: null, backtest: null }} onStudent={noop} />
  ),
};
