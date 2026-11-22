import { formatPeriod, miniappMessages as t } from '@lg/i18n';
import { MoneyInput, Section, Segmented, TextField, useMainButton } from '@lg/ui-tg';
import { monthsBefore, type SetupGroup, type SetupRow } from '../../data/staff-setup.js';

const c = t.staffSetup;

export interface SetupViewProps {
  student: string;
  today: string;
  groups: readonly SetupGroup[];
  rows: Readonly<Record<string, SetupRow>>;
  saving: boolean;
  onRow: (enrollmentId: string, row: SetupRow) => void;
  onSave: () => void;
}

function MonthRow(p: {
  period: string;
  price: bigint;
  row: SetupRow;
  onRow: (r: SetupRow) => void;
}) {
  const { period, row } = p;
  const unpaid = period in row.unpaid;
  const set = (v: bigint | null | undefined) => {
    const rest = Object.entries(row.unpaid).filter(([k]) => k !== period);
    p.onRow({
      ...row,
      unpaid: Object.fromEntries(v === undefined ? rest : [...rest, [period, v]]),
    });
  };
  return (
    <li className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-0">
      <Segmented
        label={formatPeriod(period)}
        value={unpaid ? 'unpaid' : 'paid'}
        options={[
          { value: 'paid', label: c.paid },
          { value: 'unpaid', label: c.unpaid },
        ]}
        onChange={(v) => set(v === 'unpaid' ? p.price : undefined)}
      />
      {unpaid && (
        <MoneyInput label={c.unpaid} value={row.unpaid[period] ?? null} onChange={(v) => set(v)} />
      )}
    </li>
  );
}

/** MS-05b Boshlang'ich holat (T-145): har guruh — kelgan sana va oldingi oylar; MainButton. */
export function SetupView({ student, today, groups, rows, saving, onRow, onSave }: SetupViewProps) {
  const valid = groups.every((g) => {
    const r = rows[g.enrollmentId];
    return r && r.startDate !== '' && r.startDate <= today;
  });
  useMainButton({ text: c.save, onClick: onSave, loading: saving, visible: valid });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{c.title}</h1>
        <p className="text-sm text-text-muted">
          {student} · {c.hint}
        </p>
      </header>
      {groups.map((g) => {
        const row = rows[g.enrollmentId];
        if (!row) return null;
        const months = row.startDate ? monthsBefore(row.startDate, today) : [];
        return (
          <Section key={g.enrollmentId} title={g.name} footer={c.current}>
            <li className="px-4 py-3">
              <TextField
                label={c.startDate}
                type="date"
                max={today}
                value={row.startDate}
                onChange={(e) => onRow(g.enrollmentId, { ...row, startDate: e.target.value })}
              />
            </li>
            {months.length === 0 ? (
              <li className="px-4 py-3 text-sm text-text-muted">{c.noMonths}</li>
            ) : (
              months.map((m) => (
                <MonthRow
                  key={m}
                  period={m}
                  price={g.price}
                  row={row}
                  onRow={(r) => onRow(g.enrollmentId, r)}
                />
              ))
            )}
          </Section>
        );
      })}
    </main>
  );
}
