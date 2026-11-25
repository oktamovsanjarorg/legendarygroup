import {
  PAYROLL_BASES,
  type PayrollStaffOption,
  TEACHER_CONTRACT_TYPES,
  type TeacherContract,
} from '@lg/contracts';
import { formatMoney, formatYmd, miniappMessages as t } from '@lg/i18n';
import { ListItem, MoneyInput, Section, StatusChip, TextField, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import {
  contractBody,
  type ContractForm,
  contractState,
  contractTerms,
  staffOptions,
} from '../../data/staff-payroll.js';
import { EmptyRow, Fields, InfoSection, Screen } from './form-kit.js';
import { ChoiceSection, ConfirmSheet } from './kit.js';

const c = t.staffContracts;
const TONE = { active: 'success', upcoming: 'info', ended: 'muted' } as const;
const ALL = '';

const validity = (k: TeacherContract): string =>
  c.period
    .replace('{from}', formatYmd(k.validFrom))
    .replace('{to}', k.validTo ? c.until.replace('{date}', formatYmd(k.validTo)) : c.openEnd);

/** MS-28b Shartnomalar (FR-SAL-1). */
export function ContractsView(p: {
  items: readonly TeacherContract[];
  today: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  useMainButton({ text: c.add, onClick: p.onAdd });
  return (
    <Screen title={c.title}>
      <Section>
        {p.items.length === 0 && <EmptyRow text={c.empty} />}
        {p.items.map((k) => {
          const state = contractState(k, p.today);
          return (
            <ListItem
              key={k.id}
              title={k.teacherName}
              subtitle={[contractTerms(k), k.groupName, validity(k)].filter(Boolean).join(' · ')}
              after={<StatusChip tone={TONE[state]}>{c[state]}</StatusChip>}
              onClick={() => p.onOpen(k.id)}
            />
          );
        })}
      </Section>
    </Screen>
  );
}

/** Shartnoma: tugatish yoki xatosini oʻchirish. */
export function ContractView(p: {
  contract: TeacherContract;
  today: string;
  busy: boolean;
  onEnd: (validTo: string) => void;
  onRemove: () => void;
}) {
  const k = p.contract;
  const [confirm, setConfirm] = useState(false);
  const [date, setDate] = useState(k.validTo ?? p.today);
  useMainButton({
    text: c.endAction,
    disabled: date === '' || date === k.validTo || date < k.validFrom,
    loading: p.busy,
    onClick: () => p.onEnd(date),
  });
  const rate = BigInt(k.perLessonRate);
  return (
    <Screen title={k.teacherName ?? c.title} subtitle={contractTerms(k)}>
      <InfoSection
        items={[
          { label: c.type, value: c.types[k.type] },
          { label: c.group, value: k.groupName ?? c.allGroups },
          k.type === 'fixed' ? null : { label: c.base, value: c.bases[k.base] },
          rate > 0n ? { label: c.perLesson, value: formatMoney(rate) } : null,
          { label: c.from, value: validity(k) },
        ]}
      />
      <Fields footer={c.endHint}>
        <TextField
          label={c.lastDay}
          type="date"
          min={k.validFrom}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Fields>
      <Section>
        <ListItem
          title={<span className="text-danger">{c.remove}</span>}
          onClick={() => setConfirm(true)}
        />
      </Section>
      <ConfirmSheet
        open={confirm}
        title={c.removeTitle}
        action={c.remove}
        danger
        onClose={() => setConfirm(false)}
        onConfirm={p.onRemove}
      />
    </Screen>
  );
}

export interface ContractNewProps {
  form: ContractForm;
  staff: readonly PayrollStaffOption[];
  groups: readonly { id: string; name: string }[];
  saving: boolean;
  onForm: (f: ContractForm) => void;
  onSave: () => void;
}

function Amounts({ form, onForm }: Pick<ContractNewProps, 'form' | 'onForm'>) {
  return (
    <Fields>
      {form.type !== 'percent' && (
        <MoneyInput
          label={c.fixed}
          value={form.fixed}
          onChange={(fixed) => onForm({ ...form, fixed })}
        />
      )}
      {form.type !== 'fixed' && (
        <TextField
          label={c.percent}
          inputMode="decimal"
          maxLength={6}
          value={form.percent}
          onChange={(e) => onForm({ ...form, percent: e.target.value })}
        />
      )}
      <MoneyInput
        label={c.perLesson}
        value={form.perLesson}
        onChange={(perLesson) => onForm({ ...form, perLesson })}
      />
    </Fields>
  );
}

function Scope({ form, groups, onForm }: Pick<ContractNewProps, 'form' | 'groups' | 'onForm'>) {
  return (
    <>
      {form.type !== 'fixed' && (
        <ChoiceSection
          title={c.base}
          value={form.base}
          options={PAYROLL_BASES.map((value) => ({ value, label: c.bases[value] }))}
          onChange={(base) => onForm({ ...form, base })}
        />
      )}
      <Fields footer={c.replaceHint}>
        <TextField
          label={c.from}
          type="date"
          value={form.from}
          onChange={(e) => onForm({ ...form, from: e.target.value })}
        />
        <TextField
          label={c.to}
          type="date"
          min={form.from}
          value={form.to}
          onChange={(e) => onForm({ ...form, to: e.target.value })}
        />
      </Fields>
      <ChoiceSection
        title={c.group}
        value={form.groupId ?? ALL}
        options={[
          { value: ALL, label: c.allGroups },
          ...groups.map((g) => ({ value: g.id, label: g.name })),
        ]}
        onChange={(v) => onForm({ ...form, groupId: v || null })}
      />
    </>
  );
}

/** Yangi shartnoma: xodim → turi → summa/foiz → muddat. */
export function ContractNewView(p: ContractNewProps) {
  const { form, onForm } = p;
  useMainButton({
    text: c.save,
    disabled: contractBody(form) === null,
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <Screen title={c.add}>
      <ChoiceSection
        title={c.who}
        value={form.teacherId}
        options={staffOptions(p.staff)}
        onChange={(teacherId) => onForm({ ...form, teacherId })}
      />
      <ChoiceSection
        title={c.type}
        value={form.type}
        options={TEACHER_CONTRACT_TYPES.map((value) => ({ value, label: c.types[value] }))}
        onChange={(type) => onForm({ ...form, type })}
      />
      <Amounts form={form} onForm={onForm} />
      <Scope form={form} groups={p.groups} onForm={onForm} />
    </Screen>
  );
}
