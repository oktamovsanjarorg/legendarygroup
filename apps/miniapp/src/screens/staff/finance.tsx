import type { ExpenseItem, MonthlyPnLSummary } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import { InlineButton, KpiTile, ListItem, MoneyText, PrimaryButton, Section } from '@lg/ui-tg';
import { PeriodBar } from './kit.js';

const c = t.fin;

export interface FinanceViewProps {
  pnl: MonthlyPnLSummary;
  period: string;
  /** Joriy oy — undan keyingisi yo'q. */
  current: string;
  /** `null` — `expense.manage` yo'q. */
  expenses: readonly ExpenseItem[] | null;
  onPeriod: (step: -1 | 1) => void;
  onAdd: () => void;
  onExpense: (e: ExpenseItem) => void;
  onMore?: () => void;
}

/** Bazis punkt → foiz (bitta kasr): 2850 → «28,5». */
export const marginText = (bp: number): string =>
  c.margin.replace('{n}', String(Math.round(bp / 10) / 10).replace('.', ','));

function Pnl({ pnl }: { pnl: MonthlyPnLSummary }) {
  const net = BigInt(pnl.netProfit);
  const methods: Record<string, string> = c.methods;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <KpiTile label={c.revenue} value={<MoneyText amount={BigInt(pnl.revenue)} />} />
        <KpiTile
          label={c.net}
          value={<MoneyText amount={net} />}
          tone={net < 0n ? 'danger' : 'default'}
          note={marginText(pnl.profitMarginBp)}
        />
        <KpiTile label={c.expenses} value={<MoneyText amount={BigInt(pnl.expenses)} />} />
        <KpiTile label={c.payroll} value={<MoneyText amount={BigInt(pnl.payroll)} />} />
      </div>
      {Object.keys(pnl.revenueByMethod).length > 0 && (
        <Section title={c.byMethod}>
          {Object.entries(pnl.revenueByMethod).map(([m, v]) => (
            <ListItem key={m} title={methods[m] ?? m} after={<MoneyText amount={BigInt(v)} />} />
          ))}
        </Section>
      )}
    </>
  );
}

/** MS-27 Moliya (T-143, T-156, FR-FIN-2/3): oy xulosasi va xarajatlar. */
export function FinanceView(p: FinanceViewProps) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">{c.title}</h1>
      <PeriodBar period={p.period} current={p.current} onStep={p.onPeriod} />
      <Pnl pnl={p.pnl} />
      {p.expenses && <PrimaryButton onClick={p.onAdd}>{c.add}</PrimaryButton>}
      {p.expenses && (
        <Section title={c.list} footer={c.salaryHint}>
          {p.expenses.length === 0 && <ListItem title={c.listEmpty} />}
          {p.expenses.map((e) => (
            <ListItem
              key={e.id}
              title={c.categories[e.category]}
              subtitle={[formatYmd(e.date), e.note, e.createdByName].filter(Boolean).join(' · ')}
              after={<MoneyText amount={BigInt(e.amount)} />}
              chevron
              onClick={() => p.onExpense(e)}
            />
          ))}
        </Section>
      )}
      {p.onMore && <InlineButton onClick={p.onMore}>{t.staffKit.more}</InlineButton>}
    </main>
  );
}
