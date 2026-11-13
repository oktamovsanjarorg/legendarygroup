import { formatDateShort, formatMoney, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Card, CardTitle, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import type { ReactNode } from 'react';
import type { StudentRow, StudentStatus } from './types.js';

export type CardTab = keyof typeof t.studentCard.tabs;
const ALL_TABS = Object.keys(t.studentCard.tabs) as CardTab[];
const STATUS_TONE = { active: 'success', frozen: 'warning', archived: 'muted' } as const;

export interface LedgerRow {
  id: string;
  date: Date;
  what: string;
  /** BR-20 ishora qoidasi: debet — hisoblangan, kredit — to'langan; qoldiq > 0 — qarz. */
  debit: bigint;
  credit: bigint;
  balance: bigint;
}

export interface GuardianView {
  id: string;
  name: string;
  /** Qarindoshlik matni (`Otasi`, `Onasi` ...). */
  relation: string;
  /** `null` — ko'rishga ruxsat yo'q (02 §3). */
  phone: string | null;
  linked: boolean;
  primary?: boolean;
}

/** Maket ma'lumoti (T-017c): kartochka + ledger (T-2xx). */
export interface StudentDetail extends StudentRow {
  birthDate: Date;
  school: string;
  guardians: readonly GuardianView[];
  history: readonly { group: string; from: Date; to?: Date }[];
  ledger: readonly LedgerRow[];
}

const money = (v: bigint) => (v === 0n ? '—' : formatMoney(v));
const ledgerCols: ColumnDef<LedgerRow, unknown>[] = [
  {
    id: 'date',
    header: t.studentCard.ledgerCols.date,
    enableSorting: false,
    cell: ({ row }) => formatDateShort(row.original.date),
  },
  { accessorKey: 'what', header: t.studentCard.ledgerCols.what, enableSorting: false },
  {
    id: 'debit',
    header: t.studentCard.ledgerCols.debit,
    cell: ({ row }) => money(row.original.debit),
  },
  {
    id: 'credit',
    header: t.studentCard.ledgerCols.credit,
    cell: ({ row }) => money(row.original.credit),
  },
  {
    id: 'balance',
    header: t.studentCard.ledgerCols.balance,
    cell: ({ row }) => (
      <span className={row.original.balance > 0n ? 'font-medium text-danger' : 'text-text'}>
        {formatMoney(row.original.balance)}
      </span>
    ),
  },
];

/** Hisob (ledger) jadvali — BR-20. */
export function LedgerTable({ rows }: { rows: readonly LedgerRow[] }) {
  return (
    <DataTable
      columns={ledgerCols}
      data={rows}
      getRowId={(r) => r.id}
      numeric={['debit', 'credit', 'balance']}
      empty={{ title: '—' }}
    />
  );
}

/** "Ma'lumot" kartasi: yorliq — qiymat qatorlari. */
export function InfoCard({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">{t.studentCard.tabs.info}</CardTitle>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-text-muted">{label}</dt>
            <dd className="text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

interface GuardiansProps {
  guardians: readonly GuardianView[];
  /** Karta sarlavhasi yonidagi amal ("Ota-ona qo'shish"). */
  action?: ReactNode;
  /** Har ota-ona qatoridagi amallar. */
  rowAction?: (g: GuardianView) => ReactNode;
}

export function GuardiansCard({ guardians, action, rowAction }: GuardiansProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-base">{t.studentCard.guardians}</CardTitle>
        {action}
      </div>
      {guardians.length === 0 && <p className="text-sm text-text-muted">{t.students.noGuardian}</p>}
      {guardians.map((g) => (
        <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex flex-col">
            <span className="text-text">
              {g.name}
              {g.primary && <span className="text-text-muted"> · {t.studentCard.primary}</span>}
            </span>
            <span className="text-xs text-text-muted">
              {g.relation}
              {g.phone && ` · ${formatPhone(g.phone)}`}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Badge tone={g.linked ? 'success' : 'muted'}>
              {t.studentCard.telegram}: {g.linked ? t.studentCard.linked : t.studentCard.notLinked}
            </Badge>
            {rowAction?.(g)}
          </span>
        </div>
      ))}
    </Card>
  );
}

interface Props {
  s: { name: string; code: string; status: StudentStatus; debt?: bigint };
  tab: CardTab;
  /** Ko'rsatiladigan tablar (standart — hammasi; qurilmagan bo'limlar ko'rsatilmaydi). */
  tabs?: readonly CardTab[];
  /** Sarlavha o'ngidagi amallar. */
  actions?: ReactNode;
  onTab: (tab: CardTab) => void;
  children: ReactNode;
}

/** W-06 O'quvchi kartochkasi (FR-STU-1/2/3): sarlavha, tablar; ichki qism — `children`. */
export function StudentCardView({ s, tab, tabs = ALL_TABS, actions, onTab, children }: Props) {
  return (
    <>
      <PageHeader
        title={s.name}
        description={
          <span className="flex items-center gap-2">
            {s.code}
            <Badge tone={STATUS_TONE[s.status]}>{t.students.status[s.status]}</Badge>
            {(s.debt ?? 0n) > 0n && (
              <Badge tone="danger">
                {t.students.cols.debt}: {formatMoney(s.debt ?? 0n)}
              </Badge>
            )}
          </span>
        }
        actions={actions}
      />
      <Tabs
        label={s.name}
        value={tab}
        onChange={onTab}
        items={tabs.map((k) => ({ value: k, label: t.studentCard.tabs[k] }))}
      />
      {children}
    </>
  );
}
