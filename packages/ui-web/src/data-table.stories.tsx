import { formatMoney } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from './button.js';
import { DataTable } from './data-table.js';

interface StudentRow {
  id: string;
  name: string;
  course: string;
  attendance: string;
  balance: bigint;
}

const COLUMNS: ColumnDef<StudentRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'F.I.SH.',
  },
  {
    accessorKey: 'course',
    header: 'Kurs',
  },
  {
    accessorKey: 'attendance',
    header: 'Davomat',
  },
  {
    accessorKey: 'balance',
    header: 'Balans',
    cell: ({ row }) => formatMoney(row.original.balance),
  },
];

const MOCK_DATA: readonly StudentRow[] = [
  {
    id: '1',
    name: 'Ali Valiyev',
    course: 'Ingliz tili (IELTS)',
    attendance: '96%',
    balance: 650_000n,
  },
  {
    id: '2',
    name: 'Zuhra Karimova',
    course: 'Matematika',
    attendance: '92%',
    balance: 0n,
  },
  {
    id: '3',
    name: 'Sardor Rahimov',
    course: 'Ingliz tili (IELTS)',
    attendance: '88%',
    balance: -350_000n,
  },
  {
    id: '4',
    name: 'Fotima Yusupova',
    course: 'Matematika',
    attendance: '100%',
    balance: 550_000n,
  },
];

const meta = {
  title: 'ui-web/DataTable',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DataWithNumeric: Story = {
  render: () => (
    <div className="p-4">
      <DataTable
        columns={COLUMNS}
        data={MOCK_DATA}
        getRowId={(r) => r.id}
        numeric={['attendance', 'balance']}
        empty={{ title: 'Oʻquvchilar topilmadi' }}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="p-4">
      <DataTable
        columns={COLUMNS}
        data={[]}
        getRowId={(r) => r.id}
        numeric={['attendance', 'balance']}
        loading
        empty={{ title: 'Oʻquvchilar topilmadi' }}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="p-4">
      <DataTable
        columns={COLUMNS}
        data={[]}
        getRowId={(r) => r.id}
        numeric={['attendance', 'balance']}
        empty={{
          title: 'Hali birorta ham oʻquvchi roʻyxatdan oʻtmagan',
          action: <Button size="sm">Oʻquvchi qoʻshish</Button>,
        }}
      />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="p-4">
      <DataTable
        columns={COLUMNS}
        data={[]}
        getRowId={(r) => r.id}
        numeric={['attendance', 'balance']}
        empty={{ title: 'Oʻquvchilar topilmadi' }}
        error={{
          message: 'Maʼlumotlarni yuklashda xatolik yuz berdi.',
          requestId: 'req_8f2c1a',
          onRetry: () => undefined,
        }}
      />
    </div>
  ),
};

export const WithLoadMore: Story = {
  render: () => (
    <div className="p-4">
      <DataTable
        columns={COLUMNS}
        data={MOCK_DATA}
        getRowId={(r) => r.id}
        numeric={['attendance', 'balance']}
        empty={{ title: 'Oʻquvchilar topilmadi' }}
        onLoadMore={() => undefined}
      />
    </div>
  ),
};
