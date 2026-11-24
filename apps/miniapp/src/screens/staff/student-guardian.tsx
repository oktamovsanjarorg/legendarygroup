import { GUARDIAN_RELATIONS, type GuardianLookupResult } from '@lg/contracts';
import { formatPhone, miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, TextField, useMainButton } from '@lg/ui-tg';
import { Check, Unlink } from 'lucide-react';
import { useState } from 'react';
import { type GuardianForm, guardianReady } from '../../data/staff-profile.js';
import { Fields, Screen } from './form-kit.js';
import { CallLink, ChoiceSection, ConfirmSheet } from './kit.js';

const c = t.staffGuardian;

const Toggle = (p: { label: string; hint?: string; on: boolean; onToggle: () => void }) => (
  <ListItem
    title={p.label}
    subtitle={p.hint}
    after={
      p.on ? <Check className="size-5 text-link" aria-label={t.staffNew.selected} /> : undefined
    }
    onClick={p.onToggle}
  />
);

/** Kimi bo'ladi, asosiymi, xabar oladimi — yangi va tahrir uchun umumiy. */
function LinkOptions(p: { form: GuardianForm; onForm: (f: GuardianForm) => void }) {
  const { form, onForm } = p;
  return (
    <>
      <ChoiceSection
        title={c.relation}
        value={form.relation}
        options={GUARDIAN_RELATIONS.map((r) => ({
          value: r,
          label: t.studentCard.relations[r],
        }))}
        onChange={(relation) => onForm({ ...form, relation })}
      />
      <Section>
        <Toggle
          label={c.primary}
          hint={c.primaryHint}
          on={form.isPrimary}
          onToggle={() => onForm({ ...form, isPrimary: !form.isPrimary })}
        />
        <Toggle
          label={c.notify}
          on={form.notify}
          onToggle={() => onForm({ ...form, notify: !form.notify })}
        />
      </Section>
    </>
  );
}

type Found = NonNullable<GuardianLookupResult['guardian']>;

const FoundNote = ({ g }: { g: Found }) => (
  <p role="status" className="flex flex-col rounded-xl bg-success-bg p-4 text-sm text-success">
    <span className="font-semibold">{c.found.replace('{name}', g.fullName)}</span>
    {g.children.length > 0 && (
      <span>
        {c.foundChildren.replace('{names}', g.children.map((x) => x.fullName).join(', '))}
      </span>
    )}
  </p>
);

/** Ota-ona qo'shish: telefon bazada bo'lsa — o'sha odam bog'lanadi (aka-uka, opa-singil). */
export function GuardianNewView(p: {
  form: GuardianForm;
  found: Found | null;
  saving: boolean;
  onForm: (f: GuardianForm) => void;
  onSave: () => void;
}) {
  const { form, found, onForm } = p;
  useMainButton({
    text: c.save,
    disabled: !guardianReady(form, found?.fullName ?? null),
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <Screen title={c.add}>
      <Fields>
        <TextField
          label={c.phone}
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => onForm({ ...form, phone: e.target.value })}
        />
        {!found && (
          <TextField
            label={c.name}
            autoComplete="off"
            maxLength={120}
            value={form.fullName}
            onChange={(e) => onForm({ ...form, fullName: e.target.value })}
          />
        )}
      </Fields>
      {found && <FoundNote g={found} />}
      <LinkOptions form={form} onForm={onForm} />
    </Screen>
  );
}

/** Ota-ona tahriri: ism, aloqa turi, uzish. */
export function GuardianEditView(p: {
  form: GuardianForm;
  saving: boolean;
  onForm: (f: GuardianForm) => void;
  onSave: () => void;
  onUnlink: () => void;
}) {
  const { form, onForm } = p;
  const [confirm, setConfirm] = useState(false);
  useMainButton({
    text: c.save,
    disabled: form.fullName.trim().length < 2,
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <Screen title={form.fullName} subtitle={form.phone && formatPhone(form.phone)}>
      {form.phone && <CallLink phone={form.phone} />}
      <Fields footer={`${c.renameHint} ${c.phoneLocked}`}>
        <TextField
          label={c.name}
          autoComplete="off"
          maxLength={120}
          value={form.fullName}
          onChange={(e) => onForm({ ...form, fullName: e.target.value })}
        />
      </Fields>
      <LinkOptions form={form} onForm={onForm} />
      <Section>
        <ListItem
          before={<Unlink className="size-5 text-danger" aria-hidden />}
          title={<span className="text-danger">{c.unlink}</span>}
          onClick={p.saving ? undefined : () => setConfirm(true)}
        />
      </Section>
      <ConfirmSheet
        open={confirm}
        danger
        title={c.unlinkTitle.replace('{name}', form.fullName)}
        action={c.unlink}
        onClose={() => setConfirm(false)}
        onConfirm={p.onUnlink}
      >
        <p className="px-4 pb-2 text-sm text-text-muted">{c.unlinkText}</p>
      </ConfirmSheet>
    </Screen>
  );
}
