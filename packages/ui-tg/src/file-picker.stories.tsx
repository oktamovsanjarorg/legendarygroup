import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilePicker } from './file-picker.js';

const meta = {
  title: 'ui-tg/FilePicker',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const BASE_PROPS = {
  label: 'Toʻlov cheki (rasm yoki PDF)',
  pickLabel: 'Chekni tanlash',
  replaceLabel: 'Almashtirish',
  uploadingLabel: 'Yuklanmoqda… {p}%',
  onPick: () => undefined,
};

export const Empty: Story = {
  render: () => (
    <div className="p-4">
      <FilePicker {...BASE_PROPS} state={{ kind: 'empty' }} />
    </div>
  ),
};

export const Uploading: Story = {
  render: () => (
    <div className="p-4">
      <FilePicker
        {...BASE_PROPS}
        state={{ kind: 'uploading', name: 'chek_20261112.png', percent: 65 }}
      />
    </div>
  ),
};

export const Ready: Story = {
  render: () => (
    <div className="p-4">
      <FilePicker
        {...BASE_PROPS}
        state={{
          kind: 'ready',
          name: 'chek_20261112.png',
          previewUrl:
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect fill="%23e2e8f0" width="300" height="150"/><text x="150" y="80" font-family="sans-serif" font-size="16" text-anchor="middle" fill="%2364748b">Chek rasmi (namuna)</text></svg>',
        }}
      />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="p-4">
      <FilePicker
        {...BASE_PROPS}
        state={{
          kind: 'error',
          message: 'Fayl hajmi 10 MB dan oshmasligi kerak',
        }}
      />
    </div>
  ),
};
