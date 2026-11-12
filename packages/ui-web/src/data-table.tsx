import { webMessages as t } from '@lg/i18n';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type Table,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from './button.js';
import { cn } from './cn.js';
import { EmptyState, ErrorState, Skeleton } from './states.js';

export type { ColumnDef } from '@tanstack/react-table';

/** Raqam/summa ustunlari — o'ngga, `tabular-nums` (design-system §1). */
type IsNumeric = (columnId: string) => boolean;

function Head<T>({ table, numeric }: { table: Table<T>; numeric: IsNumeric }) {
  return (
    <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
      {table.getHeaderGroups().map((g) => (
        <tr key={g.id}>
          {g.headers.map((h) => {
            const dir = h.column.getIsSorted();
            const label = flexRender(h.column.columnDef.header, h.getContext());
            return (
              <th
                key={h.id}
                aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                className={cn('px-4 py-2.5 font-medium', numeric(h.column.id) && 'text-right')}
              >
                {h.column.getCanSort() ? (
                  <button
                    type="button"
                    onClick={h.column.getToggleSortingHandler()}
                    className="inline-flex items-center gap-1 uppercase hover:text-text"
                  >
                    {label}
                    {dir === 'asc' && <ArrowUp className="size-3" aria-hidden />}
                    {dir === 'desc' && <ArrowDown className="size-3" aria-hidden />}
                  </button>
                ) : (
                  label
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}

interface BodyProps<T> {
  table: Table<T>;
  numeric: IsNumeric;
  loading?: boolean;
  colSpan: number;
  onRowClick?: (row: T) => void;
}

function Body<T>({ table, numeric, loading, colSpan, onRowClick }: BodyProps<T>) {
  if (loading)
    return (
      <tbody>
        {Array.from({ length: 6 }, (_, i) => (
          <tr key={i} className="border-t border-border">
            <td colSpan={colSpan} className="px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </td>
          </tr>
        ))}
      </tbody>
    );
  return (
    <tbody>
      {table.getRowModel().rows.map((row) => (
        <tr
          key={row.id}
          onClick={onRowClick ? () => onRowClick(row.original) : undefined}
          className={cn('border-t border-border', onRowClick && 'cursor-pointer hover:bg-surface')}
        >
          {row.getVisibleCells().map((c) => (
            <td
              key={c.id}
              className={cn(
                'px-4 py-3 text-text',
                numeric(c.column.id) && 'text-right tabular-nums',
              )}
            >
              {flexRender(c.column.columnDef.cell, c.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

interface Props<T> {
  columns: ColumnDef<T, unknown>[];
  data: readonly T[];
  getRowId: (row: T) => string;
  /** Raqamli ustunlar (`id` yoki `accessorKey`). */
  numeric?: readonly string[];
  loading?: boolean;
  error?: { message: string; requestId?: string; onRetry: () => void };
  empty: { title: string; action?: ReactNode };
  onRowClick?: (row: T) => void;
  /** Cursor sahifalash: keyingi sahifa bor bo'lsa. */
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

/**
 * Ro'yxatlar jadvali (design-system §4, TanStack Table): 5 holat — yuklanmoqda (skeleton
 * qatorlar), bo'sh, xato; saralash (ustun sarlavhasi), qator bosish, "Yana yuklash" (cursor).
 */
export function DataTable<T>(p: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: p.data as T[],
    columns: p.columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: p.getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const isNumeric: IsNumeric = (id) => p.numeric?.includes(id) ?? false;
  if (p.error) return <ErrorState {...p.error} />;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <table className="w-full text-sm">
        <Head table={table} numeric={isNumeric} />
        <Body
          table={table}
          numeric={isNumeric}
          loading={p.loading}
          colSpan={p.columns.length}
          onRowClick={p.onRowClick}
        />
      </table>
      {!p.loading && p.data.length === 0 && (
        <EmptyState title={p.empty.title} action={p.empty.action} />
      )}
      {p.onLoadMore && (
        <div className="flex justify-center border-t border-border p-3">
          <Button variant="ghost" size="sm" loading={p.loadingMore} onClick={p.onLoadMore}>
            {t.common.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
