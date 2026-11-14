import type { LessonDto } from '@lg/contracts';
import { formatYmd, webMessages as t } from '@lg/i18n';
import { Badge, type BadgeTone, Button, Drawer } from '@lg/ui-web';
import { useState } from 'react';
import { FormError, Section } from '../../components/panel-section.js';
import { CancelForm, RescheduleForm, SubstituteForm } from './lesson-forms.js';
import { type CalendarOptions, useLessonCall } from './use-calendar.js';

const m = t.calendar.lesson;
const STATUS: Record<LessonDto['status'], { tone: BadgeTone; label: string }> = {
  scheduled: { tone: 'info', label: t.calendar.scheduled },
  done: { tone: 'success', label: t.calendar.done },
  cancelled: { tone: 'danger', label: t.calendar.cancelled },
};
const KIND = { regular: null, extra: t.calendar.extra, makeup: t.calendar.makeup } as const;

function Summary({ l }: { l: LessonDto }) {
  const kind = KIND[l.kind];
  const reason = l.cancelSource === 'holiday' ? m.bySystem : l.cancelReason;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-text-muted">{m.status}</dt>
      <dd className="flex flex-wrap gap-1">
        <Badge tone={STATUS[l.status].tone}>{STATUS[l.status].label}</Badge>
        {kind && <Badge tone="success">{kind}</Badge>}
        {l.isSubstitute && <Badge tone="warning">{t.calendar.substitute}</Badge>}
      </dd>
      <dt className="text-text-muted">{m.date}</dt>
      <dd className="tabular-nums text-text">
        {formatYmd(l.date)} · {l.startTime}–{l.endTime}
      </dd>
      <dt className="text-text-muted">{m.teacher}</dt>
      <dd className="text-text">{l.teacher?.name ?? m.noTeacher}</dd>
      <dt className="text-text-muted">{m.room}</dt>
      <dd className="text-text">{l.room?.name ?? m.noRoom}</dd>
      {l.topic && (
        <>
          <dt className="text-text-muted">{m.topic}</dt>
          <dd className="text-text">{l.topic}</dd>
        </>
      )}
      {l.status === 'cancelled' && (
        <>
          <dt className="text-text-muted">{m.reason}</dt>
          <dd className="text-text">
            {reason ?? '—'}
            {l.compensation && (
              <span className="block text-xs text-text-muted">
                {m.compensation[l.compensation]}
              </span>
            )}
          </dd>
        </>
      )}
    </dl>
  );
}

type Open = 'substitute' | 'move' | 'cancel' | 'makeup' | null;

interface ActionsProps {
  l: LessonDto;
  options: CalendarOptions;
  onDone: () => void;
}

function ScheduledActions({ l, options, onDone }: ActionsProps) {
  const [open, setOpen] = useState<Open>(null);
  const toggle = (k: Open, label: string) => ({
    label,
    open: open === k,
    onToggle: () => setOpen(open === k ? null : k),
  });
  return (
    <>
      <Section title={m.substitute} toggle={toggle('substitute', t.common.edit)}>
        {open === 'substitute' && <SubstituteForm l={l} options={options} onDone={onDone} />}
      </Section>
      <Section title={m.move} toggle={toggle('move', m.move)}>
        {open === 'move' && <RescheduleForm l={l} kind="move" onDone={onDone} />}
      </Section>
      <Section title={m.cancel} toggle={toggle('cancel', m.cancelSubmit)}>
        {open === 'cancel' && <CancelForm l={l} onDone={onDone} />}
      </Section>
    </>
  );
}

function CancelledActions({ l, onDone }: Omit<ActionsProps, 'options'>) {
  const restore = useLessonCall();
  const [open, setOpen] = useState(false);
  const canMakeup = !l.makeupLessonId && l.compensation !== 'credit';
  return (
    <>
      {canMakeup && (
        <Section
          title={m.makeup}
          toggle={{ label: m.makeup, open, onToggle: () => setOpen((o) => !o) }}
        >
          {open && <RescheduleForm l={l} kind="makeup" onDone={onDone} />}
        </Section>
      )}
      <Section title={m.restore}>
        <FormError error={restore.error} />
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          loading={restore.isPending}
          onClick={() =>
            restore.mutate(
              { path: `/lessons/${l.id}/restore`, method: 'POST' },
              { onSuccess: onDone },
            )
          }
        >
          {m.restore}
        </Button>
      </Section>
    </>
  );
}

interface Props extends ActionsProps {
  canManage: boolean;
}

/** W-11 dars paneli: ma'lumot + amallar (`lesson.manage`): o'rinbosar, ko'chirish, bekor, tiklash. */
export function LessonDrawer({ l, options, canManage, onDone }: Props) {
  return (
    <Drawer open title={l.group.name} closeLabel={t.common.close} onClose={onDone}>
      <div className="flex flex-col gap-4">
        <Summary l={l} />
        {canManage && l.status === 'scheduled' && (
          <ScheduledActions l={l} options={options} onDone={onDone} />
        )}
        {canManage && l.status === 'cancelled' && <CancelledActions l={l} onDone={onDone} />}
      </div>
    </Drawer>
  );
}
