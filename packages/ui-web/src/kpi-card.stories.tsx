import type { Meta, StoryObj } from '@storybook/react-vite';
import { KpiCard } from './kpi-card.js';

const meta = {
  title: 'ui-web/KpiCard',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeltaUpGood: Story = {
  render: () => (
    <div className="max-w-xs p-4">
      <KpiCard
        label="Oylik tushum"
        value="78 650 000 soʻm"
        delta={{ text: '+12% oʻtgan oyga nisbatan', up: true, good: true }}
      />
    </div>
  ),
};

export const DeltaDownBad: Story = {
  render: () => (
    <div className="max-w-xs p-4">
      <KpiCard
        label="Faol oʻquvchilar"
        value="186 nafar"
        delta={{ text: '-4 nafar oʻtgan haftaga nisbatan', up: false, good: false }}
      />
    </div>
  ),
};

export const DeltaUpBad: Story = {
  render: () => (
    <div className="max-w-xs p-4">
      <KpiCard
        label="Umumiy qarz"
        value="8 400 000 soʻm"
        tone="danger"
        delta={{ text: '+15% oshdi', up: true, good: false }}
      />
    </div>
  ),
};

export const WarningTone: Story = {
  render: () => (
    <div className="max-w-xs p-4">
      <KpiCard
        label="Kutilayotgan toʻlovlar"
        value="5 ta chek"
        tone="warning"
        delta={{ text: 'Tekshirish talab etiladi', up: true, good: false }}
      />
    </div>
  ),
};

export const DashboardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Oylik tushum"
        value="78 650 000 soʻm"
        delta={{ text: '+8% oʻtgan oy', up: true, good: true }}
        onClick={() => undefined}
      />
      <KpiCard
        label="Faol oʻquvchilar"
        value="186"
        delta={{ text: '+6 yangi oʻquvchi', up: true, good: true }}
        onClick={() => undefined}
      />
      <KpiCard
        label="Davomat koʻrsatkichi"
        value="94.2%"
        delta={{ text: '+1.5% oʻsish', up: true, good: true }}
        onClick={() => undefined}
      />
      <KpiCard
        label="Umumiy qarzdorlik"
        value="3 200 000 soʻm"
        tone="danger"
        delta={{ text: '+500 000 soʻm', up: true, good: false }}
        onClick={() => undefined}
      />
    </div>
  ),
};
