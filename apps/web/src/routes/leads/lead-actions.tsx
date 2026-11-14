import { ChangeLeadStatusRequest, LEAD_STATUS_FLOW, type LeadDto } from '@lg/contracts';
import { formatYmd, webMessages as t } from '@lg/i18n';
import { Button, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { FormError } from '../../components/panel-section.js';
import { type LeadOptions, useLeadCall, useUpcomingLessons } from './use-leads.js';

const d = t.leads.detail;
type Target = keyof typeof d.to;

/** Holat tugmalari (FR-STU-4): faqat ruxsat etilgan o'tishlar; rad etish — sabab bilan. */
export function StatusActions({ l }: { l: LeadDto }) {
  const change = useLeadCall();
  const [losing, setLosing] = useState(false);
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  const next: readonly Target[] = LEAD_STATUS_FLOW[l.status];
  const go = (status: Target, lostReason: string | null = null) => {
    const body = ChangeLeadStatusRequest.safeParse({ status, lostReason });
    setInvalid(!body.success);
    if (body.success)
      change.mutate(
        { path: `/leads/${l.id}/status`, method: 'POST', body: body.data },
        { onSuccess: () => setLosing(false) },
      );
  };
  const lose = (e: FormEvent) => {
    e.preventDefault();
    go('lost', reason.trim() || null);
  };
  if (next.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === 'lost' ? 'ghost' : 'secondary'}
            disabled={change.isPending}
            onClick={() => (s === 'lost' ? setLosing(true) : go(s))}
          >
            {d.to[s]}
          </Button>
        ))}
      </div>
      {losing && (
        <form className="flex flex-col gap-3" onSubmit={lose} noValidate>
          <Field
            label={d.lostReason}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={invalid ? d.reasonRequired : null}
          />
          <Button
            type="submit"
            variant="danger"
            size="sm"
            className="self-end"
            loading={change.isPending}
          >
            {d.lostSubmit}
          </Button>
        </form>
      )}
      <FormError error={change.error} />
    </div>
  );
}

interface TrialProps {
  l: LeadDto;
  options: LeadOptions;
  onDone: () => void;
}

/** Sinov darsiga yozish: guruh → yaqin 14 kundagi rejalashtirilgan dars. Holat → `trial`. */
export function TrialForm({ l, options, onDone }: TrialProps) {
  const save = useLeadCall();
  const [groupId, setGroup] = useState('');
  const [lessonId, setLesson] = useState('');
  const [invalid, setInvalid] = useState(false);
  const lessons = useUpcomingLessons(groupId);
  const none = { value: '', label: t.groups.form.none };
  const lessonOptions = (lessons.data ?? []).map((x) => ({
    value: x.id,
    label: `${formatYmd(x.date)} · ${x.startTime}–${x.endTime}`,
  }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setInvalid(!lessonId);
    if (lessonId)
      save.mutate(
        { path: `/leads/${l.id}/trial`, method: 'POST', body: { lessonId } },
        { onSuccess: onDone },
      );
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <SelectField
        label={d.trialGroup}
        options={[none, ...options.groups]}
        value={groupId}
        onChange={(e) => {
          setGroup(e.target.value);
          setLesson('');
        }}
      />
      <SelectField
        label={d.trialLesson}
        options={[none, ...lessonOptions]}
        value={lessonId}
        disabled={!groupId}
        onChange={(e) => setLesson(e.target.value)}
        error={invalid ? d.trialRequired : null}
      />
      {groupId && lessons.isSuccess && lessonOptions.length === 0 && (
        <p className="text-sm text-text-muted">{d.noLessons}</p>
      )}
      <FormError error={save.error} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {d.trialSubmit}
      </Button>
    </form>
  );
}
