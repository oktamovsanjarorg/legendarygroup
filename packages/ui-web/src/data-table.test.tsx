import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ColumnDef, DataTable } from './data-table.js';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  debt: number;
}
const rows: Row[] = [
  { id: 'a', name: 'Bobur', debt: 300 },
  { id: 'b', name: 'Ali', debt: 900 },
  { id: 'c', name: 'Vali', debt: 0 },
];
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Ism' },
  { accessorKey: 'debt', header: 'Qarz' },
];
const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0]?.textContent);

describe('DataTable (design-system §4)', () => {
  it('sarlavha bosilsa saralanadi (asc → desc), aria-sort bilan', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        empty={{ title: 'Boʻsh' }}
        numeric={['debt']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ism' }));
    expect(names()).toEqual(['Ali', 'Bobur', 'Vali']);
    fireEvent.click(screen.getByRole('button', { name: 'Qarz' }));
    // Raqamli ustun TanStack'da birinchi bosishda kamayish bo'yicha.
    expect(names()).toEqual(['Ali', 'Bobur', 'Vali']);
    expect(screen.getByRole('columnheader', { name: 'Qarz' }).getAttribute('aria-sort')).toBe(
      'descending',
    );
  });

  it('qator bosilsa — asl obyekt; raqam ustuni o‘ngga tekislanadi', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        empty={{ title: 'Boʻsh' }}
        numeric={['debt']}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByText('Vali'));
    expect(onRowClick).toHaveBeenCalledWith(rows[2]);
    expect(screen.getByText('900').className).toContain('text-right');
  });

  it("bo'sh va yuklanmoqda holatlari", () => {
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        empty={{ title: 'Oʻquvchi topilmadi' }}
      />,
    );
    expect(screen.getByText('Oʻquvchi topilmadi')).toBeTruthy();
    rerender(
      <DataTable
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        loading
        empty={{ title: 'Oʻquvchi topilmadi' }}
      />,
    );
    expect(screen.queryByText('Oʻquvchi topilmadi')).toBeNull();
  });
});
