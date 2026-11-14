import { miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, MoneyText, Section, StatusChip } from '@lg/ui-tg';

export type PayrollState = 'draft' | 'approved' | 'paid';

export interface PayrollMonth {
  id: string;
  title: string;
  total: bigint;
  state: PayrollState;
}

const CHIP = {
  draft: { tone: 'muted', label: t.payroll.draft },
  approved: { tone: 'info', label: t.payroll.approved },
  paid: { tone: 'success', label: t.payroll.paid },
} as const;

export function PayrollChip({ state }: { state: PayrollState }) {
  return <StatusChip tone={CHIP[state].tone}>{CHIP[state].label}</StatusChip>;
}

interface ListProps {
  months: readonly PayrollMonth[];
  onOpen: (m: PayrollMonth) => void;
  onSettings: () => void;
}

/** MT-11 Profil va oylik (FR-SAL-4): faqat o'z hisobi. */
export function PayrollView({ months, onOpen, onSettings }: ListProps) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{t.payroll.title}</h1>
      {months.length === 0 ? (
        <EmptyState title={t.payroll.empty} hint={t.payroll.emptyHint} />
      ) : (
        <Section title={t.payroll.months}>
          {months.map((m) => (
            <ListItem
              key={m.id}
              title={m.title}
              subtitle={<PayrollChip state={m.state} />}
              after={<MoneyText amount={m.total} className="text-base font-semibold" />}
              chevron
              onClick={() => onOpen(m)}
            />
          ))}
        </Section>
      )}
      <Section>
        <ListItem title={t.payroll.settings} chevron onClick={onSettings} />
      </Section>
    </main>
  );
}

export interface PayrollDetail {
  month: PayrollMonth;
  fixed: bigint;
  percent: { rate: number; amount: bigint };
  substituteLessons: { count: number; amount: bigint };
  bonus: bigint;
  penalty: bigint;
  /** Q-33: ism + summa (to'lov usulisiz). */
  byStudent: readonly { name: string; amount: bigint }[];
}

const money = (a: bigint) => <MoneyText amount={a} />;

/** MT-11 → oy tafsiloti (FR-SAL-3): qismlar va o'quvchilar bo'yicha. */
export function PayrollDetailView({ d }: { d: PayrollDetail }) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="flex items-center justify-between px-2">
        <h1 className="text-xl font-semibold text-text">{d.month.title}</h1>
        <PayrollChip state={d.month.state} />
      </header>
      <Section>
        <ListItem title={t.payroll.fixed} after={money(d.fixed)} />
        <ListItem
          title={t.payroll.percent.replace('{p}', String(d.percent.rate))}
          after={money(d.percent.amount)}
        />
        {d.substituteLessons.count > 0 && (
          <ListItem
            title={t.payroll.lessons.replace('{n}', String(d.substituteLessons.count))}
            after={money(d.substituteLessons.amount)}
          />
        )}
        {d.bonus > 0n && <ListItem title={t.payroll.bonus} after={money(d.bonus)} />}
        {d.penalty > 0n && <ListItem title={t.payroll.penalty} after={money(-d.penalty)} />}
        <ListItem
          title={<span className="font-semibold">{t.payroll.total}</span>}
          after={<MoneyText amount={d.month.total} className="text-base font-bold" />}
        />
      </Section>
      <Section title={t.payroll.byStudent}>
        {d.byStudent.map((s) => (
          <ListItem key={s.name} title={s.name} after={money(s.amount)} />
        ))}
      </Section>
    </main>
  );
}
