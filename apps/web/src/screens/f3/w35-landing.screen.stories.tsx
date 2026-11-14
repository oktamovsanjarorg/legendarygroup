import { errorMessages } from '@lg/i18n';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MOCK_LANDING_COURSES } from './mock-analytics.js';
import { LandingView } from './w35-landing.js';

const noop = () => undefined;

const meta: Meta = { title: 'web/F3/W-35 Landing' };
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['primary'],
  render: () => <LandingView courses={MOCK_LANDING_COURSES} onLoginClick={noop} />,
};

export const Empty: Story = {
  render: () => <LandingView courses={[]} onLoginClick={noop} />,
};

export const Offline: Story = {
  render: () => (
    <div className="relative">
      <div className="bg-warning text-warning-fg p-2 text-center text-xs font-medium">
        Internet bilan aloqa yoʻq (Offline rejim)
      </div>
      <LandingView courses={MOCK_LANDING_COURSES} onLoginClick={noop} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="min-h-screen p-8 bg-bg">
      <LoadingState rows={8} />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div className="min-h-screen p-8 bg-bg">
      <ErrorState message={errorMessages.HTTP_ERROR} requestId="req_landing_err" onRetry={noop} />
    </div>
  ),
};

export const Forbidden: Story = {
  render: () => (
    <div className="min-h-screen p-8 bg-bg">
      <ForbiddenState onHome={noop} />
    </div>
  ),
};
