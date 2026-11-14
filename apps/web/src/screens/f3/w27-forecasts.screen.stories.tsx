import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_CHURN_STUDENTS, MOCK_FORECAST_REVENUE } from './mock-analytics.js';
import { ForecastsView } from './w27-forecasts.js';

const meta: Meta = { title: 'web/F3/W-27 Prognozlar' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/finance">
      <ForecastsView forecast={MOCK_FORECAST_REVENUE} churnStudents={MOCK_CHURN_STUDENTS} />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/finance">
      <ForecastsView
        forecast={{ conservative: 0n, expected: 0n, optimistic: 0n }}
        churnStudents={[]}
      />
    </WebFrame>
  ),
};

export const Offline: Story = {
  render: () => (
    <WebFrame active="/finance" offline>
      <ForecastsView forecast={MOCK_FORECAST_REVENUE} churnStudents={MOCK_CHURN_STUDENTS} />
    </WebFrame>
  ),
};

const states = webStates('/finance', t.forecasts.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
