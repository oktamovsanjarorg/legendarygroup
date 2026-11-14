import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';
import { Card, CardTitle } from './card.js';

const meta: Meta = {
  title: 'ui-web/Card',
  decorators: [
    (Story) => (
      <div className="max-w-xl p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardTitle className="mb-2">Guruh haqida umumiy maʼlumot</CardTitle>
      <p className="text-sm text-text-muted">
        Ushbu guruh haftasiga 3 marta, soat 14:00 dan 15:30 gacha boʻlib oʻtadi. Asosiy ustoz —
        Jamshid Qodirov.
      </p>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Filial sozlamalari</CardTitle>
          <p className="text-sm text-text-muted">Asosiy filial sozlamalarini yangilash</p>
        </div>
        <Button variant="secondary" size="sm">
          Tahrirlash
        </Button>
      </div>
      <div className="rounded-md bg-surface p-3 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-text-muted">Manzil:</span>
          <span className="font-medium text-text">Toshkent sh., Yunusobod tumani, 4-mavze</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-text-muted">Ish vaqti:</span>
          <span className="font-medium text-text">08:00 – 20:00</span>
        </div>
      </div>
    </Card>
  ),
};
