import { errorMessages } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { Card, CardTitle } from './card.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState, OfflineBanner } from './states.js';

/** 5 holat — har ekranda majburiy (11-ux §4.6, screens.md §0). */
const meta: Meta = {
  title: 'ui-web/States',
  decorators: [
    (Story) => (
      <Card className="max-w-3xl">
        <CardTitle className="mb-4">Oʻquvchilar</CardTitle>
        <Story />
      </Card>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { render: () => <LoadingState rows={5} /> };
export const Empty: Story = {
  render: () => (
    <EmptyState title="Hali oʻquvchi yoʻq" action={<Button>Oʻquvchi qoʻshish</Button>} />
  ),
};
export const Error: Story = {
  render: () => (
    <ErrorState
      message={errorMessages.HTTP_ERROR}
      requestId="req_8f2c1a"
      onRetry={() => undefined}
    />
  ),
};
export const Offline: Story = { render: () => <OfflineBanner /> };
export const Forbidden: Story = { render: () => <ForbiddenState onHome={() => undefined} /> };
