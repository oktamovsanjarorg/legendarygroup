import type { LeadDto, LeadStatsDto } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Badge, ForbiddenState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { useDebounced } from '../../lib/use-debounced.js';
import { toDate } from '../../lib/ymd.js';
import { type Lead, LeadsView } from '../../screens/f1/leads.js';
import { LeadDrawer, type LeadPanel } from './lead-drawer.js';
import { CreateLeadDrawer } from './lead-form.js';
import { useLeadOptions, useLeads, useLeadStats } from './use-leads.js';

const toCard = (l: LeadDto): Lead => ({
  id: l.id,
  name: l.fullName,
  phone: l.phone,
  course: l.course?.name ?? null,
  source: l.source ? t.students.sources[l.source] : null,
  stage: l.status,
  trialAt: l.trial ? toDate(l.trial.date) : undefined,
});

/** Manba statistikasi (oy): jami, konversiya va manbalar bo'yicha sonlar. */
function Stats({ stats }: { stats: LeadStatsDto | undefined }) {
  if (!stats) return null;
  const s = t.leads.stats;
  return (
    <section
      aria-label={t.leads.sources}
      className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text"
    >
      <span className="font-medium">{t.leads.sources}:</span>
      {stats.total.total === 0 ? (
        <span className="text-text-muted">{s.empty}</span>
      ) : (
        <>
          <Badge tone="info">{s.total.replace('{n}', String(stats.total.total))}</Badge>
          <Badge tone="success">
            {s.conversion.replace('{p}', String(stats.total.conversionPercent).replace('.', ','))}
          </Badge>
          {stats.bySource.map((b) => (
            <Badge key={b.source ?? 'none'} tone="muted">
              {b.source ? t.students.sources[b.source] : t.leads.noSource}: {b.total}
            </Badge>
          ))}
        </>
      )}
    </section>
  );
}

type Panel = { kind: 'new' } | { kind: 'lead'; id: string; initial: LeadPanel } | null;

function LeadsScreen({ can }: { can: { courses: boolean; groups: boolean } }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const leads = useLeads(useDebounced(query.trim()));
  const stats = useLeadStats();
  const options = useLeadOptions(can);
  const openLead = (id: string, initial: LeadPanel = null) =>
    setPanel({ kind: 'lead', id, initial });
  const openId = panel?.kind === 'lead' ? panel.id : null;
  const selected = leads.data?.find((l) => l.id === openId);
  const close = () => setPanel(null);
  return (
    <>
      <LeadsView
        leads={(leads.data ?? []).map(toCard)}
        query={query}
        loading={leads.isPending}
        error={leads.isError ? errorView(leads.error, () => void leads.refetch()) : undefined}
        stats={<Stats stats={stats.data} />}
        onQuery={setQuery}
        onOpen={(l) => openLead(l.id)}
        onConvert={(l) => openLead(l.id, 'convert')}
        onNew={() => setPanel({ kind: 'new' })}
      />
      {panel?.kind === 'new' && (
        <CreateLeadDrawer options={options} onOpenExisting={openLead} onClose={close} />
      )}
      {selected && panel?.kind === 'lead' && (
        <LeadDrawer
          key={`${selected.id}-${panel.initial ?? ''}`}
          l={selected}
          options={options}
          initial={panel.initial}
          onStudent={(id) => void navigate({ to: '/students/$id', params: { id } })}
          onClose={close}
        />
      )}
    </>
  );
}

/** W-08 Lidlar (T-107, FR-STU-4): `lead.manage`. */
export function LeadsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('lead.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return (
    <LeadsScreen
      can={{ courses: permissions.has('course.manage'), groups: permissions.has('group.view') }}
    />
  );
}
