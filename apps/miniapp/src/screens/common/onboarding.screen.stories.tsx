import type { Meta, StoryObj } from '@storybook/react-vite';
import { type OnboardPhase, OnboardingView } from './onboarding.js';

const meta: Meta = { title: 'miniapp/Umumiy/C-03 Xush kelibsiz (Q-111)' };
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const view = (phase: OnboardPhase, over: { canShare?: boolean; error?: string } = {}) => (
  <OnboardingView
    phase={phase}
    canShare={over.canShare ?? true}
    busy={false}
    error={over.error ?? null}
    code=""
    onCode={noop}
    onShare={noop}
    onRequest={noop}
    onStudent={noop}
    onBack={noop}
    onRefresh={noop}
    onSubmitCode={noop}
    onBot={noop}
  />
);

export const C03_Start: Story = { tags: ['primary'], render: () => view('start') };
export const C03_Unknown: Story = { render: () => view('unknown') };
export const C03_Requested: Story = { render: () => view('requested') };
export const C03_Student: Story = { render: () => view('student') };
export const C03_Conflict: Story = { render: () => view('conflict') };
export const C03_OldClient: Story = { render: () => view('start', { canShare: false }) };
