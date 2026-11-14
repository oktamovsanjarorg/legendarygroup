import type { LeadDto } from '@lg/contracts';
import { formatDateShort, formatPhone, formatYmd, webMessages as t } from '@lg/i18n';
import { Badge, Button, Drawer } from '@lg/ui-web';
import { useState } from 'react';
import { Section } from '../../components/panel-section.js';
import { ConvertForm } from './convert-form.js';
import { StatusActions, TrialForm } from './lead-actions.js';
import { LeadForm } from './lead-form.js';
import type { LeadOptions } from './use-leads.js';

const d = t.leads.detail;
const TONE = {
  new: 'info',
  contacted: 'muted',
  trial: 'warning',
  won: 'success',
  lost: 'danger',
} as const;
const OPEN_STATUSES: readonly LeadDto['status'][] = ['new', 'contacted', 'trial'];

function Summary({ l }: { l: LeadDto }) {
  const rows: (readonly [string, string | null])[] = [
    [d.phone, formatPhone(l.phone)],
    [d.course, l.course?.name ?? t.leads.noCourse],
    [d.source, l.source ? t.students.sources[l.source] : t.leads.noSource],
    [d.assigned, l.assignedTo?.name ?? null],
    [d.notes, l.notes],
    [d.lostReason, l.status === 'lost' ? l.lostReason : null],
    [d.created, formatDateShort(new Date(l.createdAt))],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-text-muted">{t.groups.cols.status}</dt>
      <dd className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[l.status]}>{t.leads.stages[l.status]}</Badge>
        {l.trial && (
          <span className="text-xs text-text-muted">
            {t.leads.trialAt.replace('{date}', `${formatYmd(l.trial.date)} ${l.trial.startTime}`)} ·{' '}
            {l.trial.group.name}
          </span>
        )}
      </dd>
      {rows.map(
        ([label, value]) =>
          value && (
            <div key={label} className="contents">
              <dt className="text-text-muted">{label}</dt>
              <dd className="text-text">{value}</dd>
            </div>
          ),
      )}
    </dl>
  );
}

export type LeadPanel = 'edit' | 'trial' | 'convert' | null;

interface Props {
  l: LeadDto;
  options: LeadOptions;
  /** Ochilganda darhol ko'rsatiladigan bo'lim (kartadagi "O'quvchiga aylantirish"). */
  initial?: LeadPanel;
  onStudent: (studentId: string) => void;
  onClose: () => void;
}

/** W-08 lid paneli: ma'lumot, holat, sinov darsi, tahrirlash, o'quvchiga aylantirish. */
export function LeadDrawer({ l, options, initial = null, onStudent, onClose }: Props) {
  const [open, setOpen] = useState<LeadPanel>(initial);
  const toggle = (k: LeadPanel, label: string) => ({
    label,
    open: open === k,
    onToggle: () => setOpen(open === k ? null : k),
  });
  const active = OPEN_STATUSES.includes(l.status);
  const studentId = l.studentId;
  return (
    <Drawer open title={l.fullName} closeLabel={t.common.close} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Summary l={l} />
        {studentId && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => onStudent(studentId)}
          >
            {d.student}
          </Button>
        )}
        <StatusActions l={l} />
        {active && (
          <>
            {options.groups.length > 0 && (
              <Section title={d.trial} toggle={toggle('trial', d.trialSubmit)}>
                {open === 'trial' && (
                  <TrialForm l={l} options={options} onDone={() => setOpen(null)} />
                )}
              </Section>
            )}
            <Section title={t.leads.convert} toggle={toggle('convert', t.leads.convert)}>
              {open === 'convert' && (
                <ConvertForm l={l} options={options} onConverted={onStudent} />
              )}
            </Section>
            <Section title={d.edit} toggle={toggle('edit', t.common.edit)}>
              {open === 'edit' && (
                <LeadForm
                  formId="lead-edit-form"
                  lead={l}
                  options={options}
                  onSaved={() => setOpen(null)}
                />
              )}
            </Section>
          </>
        )}
      </div>
    </Drawer>
  );
}
