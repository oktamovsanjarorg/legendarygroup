import type { LeadStatus } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import { useLead, useLeadSave, useLeads, useLeadStats } from '../data/staff-leads.js';
import { LeadsView, LeadView } from '../screens/staff/leads.js';
import { ErrorNotice } from './notice.js';

/** MS-09 Lidlar (T-133). */
export function StaffLeadsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LeadStatus>('new');
  const [q, setQ] = useState('');
  const query = useLeads(status, q);
  const total = useLeadStats().data?.total;
  return (
    <QueryView query={query}>
      {(items) => (
        <LeadsView
          items={items}
          status={status}
          query={q}
          summary={
            total
              ? t.leads.month
                  .replace('{n}', String(total.total))
                  .replace('{p}', String(Math.round(total.conversionPercent)))
              : null
          }
          onStatus={setStatus}
          onQuery={setQ}
          onOpen={(l) => void navigate({ to: '/staff/leads/$id', params: { id: l.id } })}
          onAdd={() => void navigate({ to: '/staff/leads/new' })}
        />
      )}
    </QueryView>
  );
}

export function StaffLeadPage() {
  const { id } = useParams({ from: '/staff/leads/$id' });
  const navigate = useNavigate();
  const query = useLead(id);
  const save = useLeadSave(id);
  const params = { id };
  return (
    <QueryView query={query}>
      {(lead) => (
        <>
          <ErrorNotice error={save.error} />
          <LeadView
            lead={lead}
            busy={save.isPending}
            onStatus={(status) => save.mutate({ path: 'status', body: { status } })}
            onLost={() => void navigate({ to: '/staff/leads/$id/lost', params })}
            onTrial={() => void navigate({ to: '/staff/leads/$id/trial', params })}
            onConvert={() => void navigate({ to: '/staff/leads/$id/convert', params })}
            onEdit={() => void navigate({ to: '/staff/leads/$id/edit', params })}
            onStudent={(studentId) =>
              void navigate({ to: '/staff/student/$id', params: { id: studentId } })
            }
          />
        </>
      )}
    </QueryView>
  );
}
