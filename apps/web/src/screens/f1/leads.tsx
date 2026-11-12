import { formatDateShort, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, PageHeader } from '@lg/ui-web';
import { Plus } from 'lucide-react';

export type LeadStage = keyof typeof t.leads.stages;

export interface Lead {
  id: string;
  name: string;
  phone: string;
  course: string;
  source: string;
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

function LeadCard({ l, onConvert }: { l: Lead; onConvert: (l: Lead) => void }) {
  return (
    <article className="flex flex-col gap-1.5 rounded-md border border-border bg-bg p-3 text-sm shadow-sm">
      <p className="font-medium text-text">{l.name}</p>
      <p className="text-xs text-text-muted">
        {formatPhone(l.phone)} · {l.course}
      </p>
      <p className="text-xs text-text-muted">{t.leads.source.replace('{s}', l.source)}</p>
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

/** W-08 Lidlar (FR-STU-4): kanban — holatlar ustunlari; sinov darsidan o'quvchiga aylantirish. */
export function LeadsView({
  leads,
  onConvert,
  onNew,
}: {
  leads: readonly Lead[];
  onConvert: (l: Lead) => void;
  onNew: () => void;
}) {
  return (
    <>
      <PageHeader
        title={t.leads.title}
        actions={
          <Button onClick={onNew}>
            <Plus className="size-4" aria-hidden />
            {t.common.add}
          </Button>
        }
      />
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
                <LeadCard key={l.id} l={l} onConvert={onConvert} />
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
