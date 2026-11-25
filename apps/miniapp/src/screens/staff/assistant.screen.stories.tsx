import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssistantView, type AssistantViewProps } from './assistant.js';

const meta: Meta = { title: 'miniapp/Xodim/MS-35 Yordamchi (Q-114)' };
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const base: AssistantViewProps = {
  enabled: true,
  entries: [],
  pending: false,
  error: null,
  onAsk: noop,
  onAction: noop,
  onClear: noop,
};
const view = (over: Partial<AssistantViewProps>) => <AssistantView {...base} {...over} />;

export const MS35_Bosh: Story = { tags: ['primary'], render: () => view({}) };
export const MS35_Suhbat: Story = {
  render: () =>
    view({
      entries: [
        { role: 'user', text: 'Ali Valiyevning qarzi qancha?' },
        {
          role: 'assistant',
          text: 'Ali Valiyev (1042), «Robototexnika 1»: qarz 650 000 soʻm.',
          actions: [
            { screen: 'pay', studentId: '1', label: 'Ali Valiyev' },
            { screen: 'student', studentId: '1' },
          ],
        },
      ],
    }),
};
export const MS35_Oylayapti: Story = {
  render: () => view({ entries: [{ role: 'user', text: 'Bugun nima holat?' }], pending: true }),
};
export const MS35_Xato: Story = {
  render: () =>
    view({
      entries: [{ role: 'user', text: 'Bugun nima holat?' }],
      error: 'Yordamchi hozir javob bera olmadi. Birozdan keyin qayta soʻrang.',
    }),
};
export const MS35_Ochiq: Story = { render: () => view({ enabled: false }) };
