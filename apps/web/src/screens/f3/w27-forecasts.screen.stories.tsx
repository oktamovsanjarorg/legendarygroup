import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { MOCK_CHURN_STUDENTS, MOCK_FORECAST_MONTHS, MOCK_OCCUPANCY } from './mock-analytics.js';
import { ForecastsView } from './w27-forecasts.js';

const meta: Meta = { title: 'web/F3/W-27 Prognozlar' };
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;

export const Default: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/forecasts">
      <ForecastsView
        revenue={{ rows: MOCK_FORECAST_MONTHS }}
        churn={{ rows: MOCK_CHURN_STUDENTS, total: 134 }}
        occupancy={{ rows: MOCK_OCCUPANCY }}
        onOpenStudent={noop}
      />
    </WebFrame>
  ),
};

/** Admin: finance.view yoʻq — tushum boʻlimi yoʻq. */
export const WithoutFinance: Story = {
  render: () => (
    <WebFrame active="/forecasts">
      <ForecastsView
        revenue={null}
        churn={{ rows: MOCK_CHURN_STUDENTS, total: 134 }}
        occupancy={{ rows: MOCK_OCCUPANCY }}
        onOpenStudent={noop}
      />
    </WebFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <WebFrame active="/forecasts">
      <ForecastsView
        revenue={{ rows: [] }}
        churn={{ rows: [], total: 0 }}
        occupancy={{ rows: [] }}
      />
    </WebFrame>
  ),
};

const states = webStates('/forecasts', t.forecasts.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
