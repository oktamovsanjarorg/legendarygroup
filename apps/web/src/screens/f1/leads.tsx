import { formatDateShort, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, ErrorState, LoadingState, PageHeader } from '@lg/ui-web';
import { Plus, Search } from 'lucide-react';
import type { ReactNode } from 'react';

export type LeadStage = keyof typeof t.leads.stages;

export interface Lead {
  id: string;
  name: string;
  phone: string;
  /** `null` — kurs tanlanmagan. */
  course: string | null;
  /** Manba matni; `null` — ko'rsatilmagan. */
  source: string | null;
  stage: LeadStage;
  trialAt?: Date;
}

const STAGES = Object.keys(t.leads.stages) as LeadStage[];
const TONE = {
  new: 'info',
  contacted: 'muted',
  trial: 'warning',
  won: 'success',
  lost: 'danger',
} as const;

interface CardProps {
  l: Lead;
  onOpen?: (l: Lead) => void;
  onConvert: (l: Lead) => void;
}

function LeadCard({ l, onOpen, onConvert }: CardProps) {
  const name = <span className="font-medium text-text">{l.name}</span>;
  return (
    <article className="flex flex-col gap-1.5 rounded-md border border-border bg-bg p-3 text-sm shadow-sm">
      {onOpen ? (
        <button type="button" className="text-left hover:underline" onClick={() => onOpen(l)}>
          {name}
        </button>
      ) : (
        <p>{name}</p>
      )}
      <p className="text-xs text-text-muted">
        {formatPhone(l.phone)} · {l.course ?? t.leads.noCourse}
      </p>
      <p className="text-xs text-text-muted">
        {t.leads.source.replace('{s}', l.source ?? t.leads.noSource)}
      </p>
      {l.trialAt && (
        <Badge tone="warning">
          {t.leads.trialAt.replace('{date}', formatDateShort(l.trialAt))}
        </Badge>
      )}
      {l.stage === 'trial' && (
        <Button size="sm" variant="secondary" onClick={() => onConvert(l)}>
          {t.leads.convert}
        </Button>
      )}
    </article>
  );
}

interface Props {
  leads: readonly Lead[];
  /** Qidiruv (ism yoki telefon); berilmasa — maydon ko'rsatilmaydi. */
  query?: string;
  loading?: boolean;
  error?: { message: string; requestId?: string; onRetry: () => void };
  /** Manba statistikasi (oy) — kanban ustida. */
  stats?: ReactNode;
  onQuery?: (q: string) => void;
  onOpen?: (l: Lead) => void;
  onConvert: (l: Lead) => void;
  onNew: () => void;
}

function Board({ leads, onOpen, onConvert }: Pick<Props, 'leads' | 'onOpen' | 'onConvert'>) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {STAGES.map((stage) => {
        const items = leads.filter((l) => l.stage === stage);
        return (
          <section
            key={stage}
            className="flex min-h-96 flex-col gap-2 rounded-lg bg-surface p-2"
            aria-label={t.leads.stages[stage]}
          >
            <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-text">
              {t.leads.stages[stage]}
              <Badge tone={TONE[stage]}>{items.length}</Badge>
            </h2>
            {items.map((l) => (
              <LeadCard key={l.id} l={l} onOpen={onOpen} onConvert={onConvert} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** W-08 Lidlar (FR-STU-4): kanban — holatlar ustunlari; sinov darsidan o'quvchiga aylantirish. */
export function LeadsView(p: Props) {
  const onQuery = p.onQuery;
  return (
    <>
      <PageHeader
        title={t.leads.title}
        actions={
          <Button onClick={p.onNew}>
            <Plus className="size-4" aria-hidden />
            {t.common.add}
          </Button>
        }
      />
      {onQuery && (
        <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border border-border bg-bg px-3">
          <Search className="size-4 text-text-muted" aria-hidden />
          <input
            type="search"
            aria-label={t.common.search}
            placeholder={t.common.search}
            value={p.query ?? ''}
            onChange={(e) => onQuery(e.target.value)}
            className="min-h-10 flex-1 bg-transparent text-sm text-text outline-none"
          />
        </div>
      )}
      {p.stats}
      {p.error ? (
        <ErrorState {...p.error} />
      ) : p.loading ? (
        <LoadingState rows={6} />
      ) : (
        <Board leads={p.leads} onOpen={p.onOpen} onConvert={p.onConvert} />
      )}
    </>
  );
}
