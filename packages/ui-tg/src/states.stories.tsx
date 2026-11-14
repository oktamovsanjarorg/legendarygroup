import { errorMessages } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMainButton } from './controls.js';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  InlineButton,
  LoadingState,
  OfflineBanner,
} from './states.js';

/** Mini App 5 holati (11-ux §4.6). Toolbar: Light / Dark / past kontrastli custom tema. */
const meta = { title: 'ui-tg/States' } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { render: () => <LoadingState /> };
export const Empty: Story = {
  render: () => (
    <EmptyState
      title="Bugun darsingiz yoʻq"
      hint="Haftalik jadvalni koʻrishingiz mumkin."
      action={<InlineButton onClick={() => undefined}>Jadvalni koʻrish</InlineButton>}
    />
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
export const LongErrorText: Story = {
  render: () => (
    <ErrorState message={errorMessages.TELEGRAM_NOT_LINKED} onRetry={() => undefined} />
  ),
};
export const Offline: Story = {
  render: () => (
    <>
      <OfflineBanner />
      <LoadingState rows={2} />
    </>
  ),
};
export const Forbidden: Story = { render: () => <ForbiddenState onHome={() => undefined} /> };

function WithMainButton() {
  useMainButton({ text: 'Saqlash (18/20 keldi)', onClick: () => undefined });
  return <EmptyState title="Davomat" hint="MainButton — pastda, bitta (11-ux §4.1)." />;
}
export const MainButtonDemo: Story = { render: () => <WithMainButton /> };
