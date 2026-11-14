import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressChart, type ChartPoint } from './progress-chart.js';

const meta = {
  title: 'ui-tg/ProgressChart',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const MULTI_POINTS: readonly ChartPoint[] = [
  { label: '1-h', value: 72 },
  { label: '2-h', value: 80 },
  { label: '3-h', value: 78 },
  { label: '4-h', value: 89 },
  { label: '5-h', value: 94 },
];

export const Empty: Story = {
  render: () => (
    <div className="p-4">
      <ProgressChart
        points={[]}
        max={100}
        emptyLabel="Grafik uchun hali yetarli baho yoʻq"
        summary="Oʻrtacha baho dinamikasi (boʻsh)"
      />
    </div>
  ),
};

export const SinglePoint: Story = {
  render: () => (
    <div className="p-4">
      <ProgressChart
        points={[{ label: '1-hafta', value: 85.5 }]}
        max={100}
        emptyLabel="Grafik uchun hali yetarli baho yoʻq"
        summary="Oʻrtacha baho dinamikasi (1 nuqta)"
      />
    </div>
  ),
};

export const MultiplePoints: Story = {
  render: () => (
    <div className="p-4">
      <ProgressChart
        points={MULTI_POINTS}
        max={100}
        emptyLabel="Grafik uchun hali yetarli baho yoʻq"
        summary="Haftalar boʻyicha oʻrtacha baho grafigi"
      />
    </div>
  ),
};
