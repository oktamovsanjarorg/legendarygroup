import { webMessages as t } from '@lg/i18n';
import { cn, PageHeader, SelectField } from '@lg/ui-web';
import { Info } from 'lucide-react';

export type Mark = 'present' | 'absent' | 'late' | 'excused' | null;

export interface AttendanceGrid {
  groups: readonly string[];
  group: string;
  /** Dars sanalari (ustunlar), `10.11` ko'rinishida. */
  dates: readonly string[];
  /** Belgilanmagan dars ustunlari indeksi (FR-ATT-5). */
  unmarked: readonly number[];
  rows: readonly { id: string; name: string; marks: readonly Mark[] }[];
}

const CELL: Record<Exclude<Mark, null>, { sign: string; cls: string }> = {
  present: { sign: '✓', cls: 'text-success' },
  absent: { sign: '✕', cls: 'bg-danger-bg text-danger' },
  late: { sign: '◷', cls: 'bg-warning-bg text-warning' },
  excused: { sign: '–', cls: 'text-text-muted' },
};

type CellHandler = (rowId: string, col: number) => void;

function GridTable({ g, onCell }: { g: AttendanceGrid; onCell: CellHandler }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg">
      <table className="w-full text-sm">
        <thead className="bg-surface text-xs text-text-muted">
          <tr>
            <th className="sticky left-0 bg-surface px-4 py-2 text-left font-medium">
              {t.students.cols.name}
            </th>
            {g.dates.map((d, i) => (
              <th
                key={d}
                className={cn(
                  'px-2 py-2 font-medium tabular-nums',
                  g.unmarked.includes(i) && 'bg-danger-bg text-danger',
                )}
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {g.rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="sticky left-0 whitespace-nowrap bg-bg px-4 py-2 text-text">
                {r.name}
              </td>
              {r.marks.map((m, i) => (
                <td key={g.dates[i]} className="p-0.5 text-center">
                  <button
                    type="button"
                    onClick={() => onCell(r.id, i)}
                    aria-label={`${r.name}, ${g.dates[i]}: ${t.attendanceGrid.marks[m ?? 'none']}`}
                    className={cn(
                      'h-8 w-full rounded font-semibold hover:ring-1 hover:ring-primary',
                      m ? CELL[m].cls : 'text-text-muted',
                    )}
                  >
                    {m ? CELL[m].sign : '·'}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** W-12 Davomat (FR-ATT-4/5): guruh × sana; o'tgan davomatni tahrirlash — sabab bilan (audit). */
export function AttendanceGridView({
  g,
  onGroup,
  onCell,
}: {
  g: AttendanceGrid;
  onGroup: (x: string) => void;
  onCell: (rowId: string, col: number) => void;
}) {
  return (
    <>
      <PageHeader title={t.attendanceGrid.title} description={t.attendanceGrid.legend} />
      <div className="mb-4 flex items-end gap-4">
        <div className="w-80">
          <SelectField
            label={t.groups.cols.name}
            value={g.group}
            onChange={(e) => onGroup(e.target.value)}
            options={g.groups.map((x) => ({ value: x, label: x }))}
          />
        </div>
        <p className="flex items-center gap-2 pb-2 text-sm text-text-muted">
          <Info className="size-4" aria-hidden />
          {t.attendanceGrid.editPast}
        </p>
      </div>
      <GridTable g={g} onCell={onCell} />
    </>
  );
}
