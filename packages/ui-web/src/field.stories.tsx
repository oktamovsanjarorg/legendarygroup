import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field } from './field.js';

const meta: Meta<typeof Field> = {
  title: 'ui-web/Field',
  component: Field,
  args: { label: 'Telefon raqam', type: 'tel', defaultValue: '+998 90 123 45 67' },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = {
  args: { label: 'Yangi parol', type: 'password', defaultValue: '', hint: 'Kamida 10 belgi.' },
};
/** Xato maydon yonida, chiqqanda (11-ux §4.8). */
export const WithError: Story = { args: { error: 'Telefon raqam yoki parol notoʻgʻri.' } };
export const Empty: Story = { args: { defaultValue: '' } };
