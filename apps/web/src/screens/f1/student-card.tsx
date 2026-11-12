import { formatDateShort, formatMoney, formatPhone, webMessages as t } from '@lg/i18n';
import {
  Badge,
  Button,
  Card,
  CardTitle,
  type ColumnDef,
  DataTable,
  PageHeader,
  Tabs,
} from '@lg/ui-web';
import { BadgePercent, PauseCircle, UserPlus } from 'lucide-react';
import type { StudentRow } from './types.js';

export type CardTab = keyof typeof t.studentCard.tabs;

export interface LedgerRow {
  id: string;
  date: Date;
  what: string;
  /** BR-20 ishora qoidasi: debet — hisoblangan, kredit — to'langan; qoldiq > 0 — qarz. */
  debit: bigint;
  credit: bigint;
  balance: bigint;
}

export interface StudentDetail extends StudentRow {
  birthDate: Date;
  school: string;
  guardians: readonly { name: string; relation: string; phone: string; linked: boolean }[];
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

function InfoTab({ s }: { s: StudentDetail }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">{t.studentCard.tabs.info}</CardTitle>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-muted">{t.studentCard.birthDate}</dt>
          <dd className="text-text">{formatDateShort(s.birthDate)}</dd>
          <dt className="text-text-muted">{t.studentCard.school}</dt>
          <dd className="text-text">{s.school}</dd>
          <dt className="text-text-muted">{t.students.cols.groups}</dt>
          <dd className="text-text">
            {s.history.map((h) => (
              <p key={h.group}>
                {h.group}{' '}
                <span className="text-text-muted">
                  (
                  {h.to
                    ? t.studentCard.left.replace('{date}', formatDateShort(h.to))
                    : t.studentCard.since.replace('{date}', formatDateShort(h.from))}
                  )
                </span>
              </p>
            ))}
          </dd>
        </dl>
      </Card>
      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">{t.studentCard.guardians}</CardTitle>
        {s.guardians.map((g) => (
          <div key={g.phone} className="flex items-center justify-between text-sm">
            <span className="flex flex-col">
              <span className="text-text">{g.name}</span>
              <span className="text-xs text-text-muted">
                {g.relation} · {formatPhone(g.phone)}
              </span>
            </span>
            <Badge tone={g.linked ? 'success' : 'muted'}>
              {t.studentCard.telegram}: {g.linked ? t.studentCard.linked : t.studentCard.notLinked}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

interface Props {
  s: StudentDetail;
  tab: CardTab;
  onTab: (tab: CardTab) => void;
}

/** W-06 O'quvchi kartochkasi (FR-STU-1/2/3): ma'lumot, guruhlar tarixi, hisob (ledger) va boshqalar. */
export function StudentCardView({ s, tab, onTab }: Props) {
  return (
    <>
      <PageHeader
        title={s.name}
        description={
          <span className="flex items-center gap-2">
            {s.code}
            <Badge tone={s.status === 'active' ? 'success' : 'warning'}>
              {t.students.status[s.status]}
            </Badge>
            {s.debt > 0n && (
              <Badge tone="danger">
                {t.students.cols.debt}: {formatMoney(s.debt)}
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="secondary">
              <BadgePercent className="size-4" aria-hidden />
              {t.studentCard.discount}
            </Button>
            <Button variant="secondary">
              <PauseCircle className="size-4" aria-hidden />
              {t.studentCard.freeze}
            </Button>
            <Button>
              <UserPlus className="size-4" aria-hidden />
              {t.studentCard.enroll}
            </Button>
          </>
        }
      />
      <Tabs
        label={s.name}
        value={tab}
        onChange={onTab}
        items={(Object.keys(t.studentCard.tabs) as CardTab[]).map((k) => ({
          value: k,
          label: t.studentCard.tabs[k],
        }))}
      />
      {tab === 'ledger' ? (
        <DataTable
          columns={ledgerCols}
          data={s.ledger}
          getRowId={(r) => r.id}
          numeric={['debit', 'credit', 'balance']}
          empty={{ title: '—' }}
        />
      ) : (
        <InfoTab s={s} />
      )}
    </>
  );
}
