import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageViewer } from './image-viewer.js';

const meta = {
  title: 'ui-tg/ImageViewer',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const RECEIPT_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23f1f5f9" width="400" height="300"/><rect x="50" y="30" width="300" height="240" rx="8" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="200" y="70" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="%230f172a">TOʻLOV CHEKI</text><line x1="80" y1="90" x2="320" y2="90" stroke="%23e2e8f0" stroke-width="2"/><text x="80" y="130" font-family="sans-serif" font-size="14" fill="%2364748b">Summa: 650 000 soʻm</text><text x="80" y="160" font-family="sans-serif" font-size="14" fill="%2364748b">Sana: 12.11.2026 14:32</text><text x="80" y="190" font-family="sans-serif" font-size="14" fill="%2364748b">Karta: **** 9012</text><text x="200" y="240" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%2316a34a">✓ MUVAFFAQIYATLI OʻTKAZILDI</text></svg>';

export const Ready: Story = {
  render: () => (
    <div className="p-4">
      <ImageViewer
        src={RECEIPT_DATA_URI}
        alt="Toʻlov cheki namunasi"
        hint="Kattalashtirish uchun bosing"
        errorLabel="Rasm yuklanmadi"
      />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="p-4">
      <ImageViewer
        src="/not-found-receipt-image.png"
        alt="Topilmagan chek"
        hint="Kattalashtirish uchun bosing"
        errorLabel="Rasm yuklanmadi"
      />
    </div>
  ),
};
