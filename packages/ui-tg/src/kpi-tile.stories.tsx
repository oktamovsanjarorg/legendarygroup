import type { Meta, StoryObj } from '@storybook/react-vite';
import { KpiTile } from './kpi-tile.js';

const meta = {
  title: 'ui-tg/KpiTile',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultTone: Story = {
  render: () => (
    <div className="w-48 p-4">
      <KpiTile
        label="Bugungi tushum"
        value="4 850 000"
        note="kecha: 3 200 000 soʻm"
        tone="default"
        onClick={() => undefined}
      />
    </div>
  ),
};

export const WarningTone: Story = {
  render: () => (
    <div className="w-48 p-4">
      <KpiTile
        label="Belgilanmagan darslar"
        value="3 ta"
        note="ustozlar eslatildi"
        tone="warning"
        onClick={() => undefined}
      />
    </div>
  ),
};

export const DangerTone: Story = {
  render: () => (
    <div className="w-48 p-4">
      <KpiTile
        label="Bugun kelmaganlar"
        value="12 nafar"
        note="kecha: 4 nafar"
        tone="danger"
        onClick={() => undefined}
      />
    </div>
  ),
};

export const DashboardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-2 p-4">
      <KpiTile
        label="Davomat"
        value="94%"
        note="kecha: 91%"
        tone="default"
        onClick={() => undefined}
      />
      <KpiTile
        label="Cheklar navbatda"
        value="5 ta"
        note="kutilmoqda"
        tone="warning"
        onClick={() => undefined}
      />
      <KpiTile
        label="Belgilanmagan"
        value="2 ta"
        note="14:00 darsi"
        tone="danger"
        onClick={() => undefined}
      />
      <KpiTile
        label="Soʻrovlar"
        value="1 ta"
        note="storno soʻrovi"
        tone="default"
        onClick={() => undefined}
      />
    </div>
  ),
};
