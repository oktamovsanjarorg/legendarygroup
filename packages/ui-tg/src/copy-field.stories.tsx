import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyField } from './copy-field.js';

const meta = {
  title: 'ui-tg/CopyField',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardNumber: Story = {
  render: () => (
    <div className="p-4">
      <CopyField
        value="8600 1234 5678 9012"
        copyLabel="Nusxalash"
        copiedLabel="Nusxalandi"
        copy={async () => undefined}
      />
    </div>
  ),
};

export const WithCaption: Story = {
  render: () => (
    <div className="p-4">
      <CopyField
        value="9860 0801 4523 7819"
        caption="Legendary Group rasmiy hisob kartasi (Humo)"
        copyLabel="Nusxalash"
        copiedLabel="Nusxalandi"
        copy={async () => undefined}
      />
    </div>
  ),
};
