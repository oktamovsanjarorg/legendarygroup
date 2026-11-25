import { ACQUISITION_SOURCES, type LessonDto } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import { InlineButton, ListItem, Section, TextArea, TextField, useMainButton } from '@lg/ui-tg';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { type LeadForm, leadReady } from '../../data/staff-leads.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';
import { ChoiceSection } from './kit.js';

const c = t.leads;
const NONE = '';

export interface LeadFormViewProps {
  title: string;
  form: LeadForm;
  courses: readonly { id: string; name: string }[];
  saving: boolean;
  onForm: (f: LeadForm) => void;
  onSave: () => void;
  /** Shu telefonda ochiq lid bor (409). */
  onExisting?: () => void;
}

/** MS-09 Yangi lid / tahrir. */
export function LeadFormView(p: LeadFormViewProps) {
  const { form, onForm } = p;
  useMainButton({
    text: c.save,
    disabled: !leadReady(form),
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <Screen title={p.title}>
      {p.onExisting && <InlineButton onClick={p.onExisting}>{c.openExisting}</InlineButton>}
      <Fields>
        <TextField
          label={c.fullName}
          autoComplete="off"
          value={form.fullName}
          onChange={(e) => onForm({ ...form, fullName: e.target.value })}
        />
        <TextField
          label={c.phone}
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => onForm({ ...form, phone: e.target.value })}
        />
        <TextArea
          label={c.notes}
          rows={2}
          maxLength={2000}
          value={form.notes}
          onChange={(e) => onForm({ ...form, notes: e.target.value })}
        />
      </Fields>
      <ChoiceSection
        title={c.course}
        value={form.courseId ?? NONE}
        options={[
          { value: NONE, label: c.noCourse },
          ...p.courses.map((x) => ({ value: x.id, label: x.name })),
        ]}
        onChange={(v) => onForm({ ...form, courseId: v || null })}
      />
      <ChoiceSection
        title={c.source}
        value={form.source}
        options={ACQUISITION_SOURCES.map((value) => ({ value, label: c.sources[value] }))}
        onChange={(source) => onForm({ ...form, source })}
      />
    </Screen>
  );
}

/** Bitta matn (sabab) so'raydigan qadam: MainButton — amal. */
export function ReasonView(p: {
  title: string;
  label: string;
  action: string;
  hint?: string;
  saving: boolean;
  onSave: (reason: string) => void;
}) {
  const [text, setText] = useState('');
  const value = text.trim();
  useMainButton({
    text: p.action,
    disabled: value.length < 3,
    loading: p.saving,
    onClick: () => p.onSave(value),
  });
  return (
    <Screen title={p.title}>
      <Fields footer={p.hint}>
        <TextArea
          label={p.label}
          rows={3}
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Fields>
    </Screen>
  );
}

export interface TrialViewProps {
  groups: readonly { id: string; name: string }[];
  groupId: string | null;
  lessons: readonly LessonDto[];
  lessonId: string | null;
  saving: boolean;
  onGroup: (id: string) => void;
  onLesson: (id: string) => void;
  onSave: () => void;
}

/** Sinov darsi: guruh → yaqin 14 kundagi dars. */
export function LeadTrialView(p: TrialViewProps) {
  useMainButton({
    text: c.trialSave,
    disabled: p.lessonId === null,
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <Screen title={c.trial}>
      <ChoiceSection
        title={c.trialGroup}
        value={p.groupId}
        options={p.groups.map((g) => ({ value: g.id, label: g.name }))}
        onChange={p.onGroup}
      />
      {p.groupId && (
        <Section title={c.trialLesson}>
          {p.lessons.length === 0 && <EmptyRow text={c.noLessons} />}
          {p.lessons.map((l) => (
            <ListItem
              key={l.id}
              title={`${formatYmd(l.date)} · ${l.startTime}–${l.endTime}`}
              subtitle={[l.teacher?.name, l.room?.name].filter(Boolean).join(' · ')}
              after={
                p.lessonId === l.id ? <Check className="size-5 text-link" aria-hidden /> : undefined
              }
              onClick={() => p.onLesson(l.id)}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}
