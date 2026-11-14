import type { Meta, StoryObj } from '@storybook/react-vite';
import { Download, Plus } from 'lucide-react';
import { Button } from './button.js';
import { PageHeader } from './page-header.js';

const meta = {
  title: 'ui-web/PageHeader',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-4">
      <PageHeader
        title="Oʻquvchilar"
        description="Markazning barcha faol va arxivlangan oʻquvchilari roʻyxati."
      />
    </div>
  ),
};

export const Simple: Story = {
  render: () => (
    <div className="p-4">
      <PageHeader title="Tizim sozlamalari" />
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="p-4">
      <PageHeader
        title="Guruhlar jadvali"
        description="2026-yil kuzgi mavsum uchun faol guruhlar va dars soatlari."
        actions={
          <>
            <Button variant="secondary">
              <Download className="mr-1.5 size-4" aria-hidden />
              Eksport
            </Button>
            <Button>
              <Plus className="mr-1.5 size-4" aria-hidden />
              Yangi guruh
            </Button>
          </>
        }
      />
    </div>
  ),
};
