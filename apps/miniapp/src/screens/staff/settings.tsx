import type { PaymentCard } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import {
  CopyField,
  type FilePickState,
  FilePicker,
  InlineButton,
  ListItem,
  MoneyInput,
  Section,
  Segmented,
  StatusChip,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { type ChangeEvent, type ReactNode, useState } from 'react';
import {
  type CardForm,
  cardText,
  cardValid,
  sectionPatch,
  SETTINGS_SECTIONS,
  type SettingsForm,
  type SettingsSection,
  START_STEPS,
  type StartState,
  type StartStep,
} from '../../data/staff-settings.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';
import { ConfirmSheet } from './kit.js';

const c = t.staffSettings;
const s = t.staffStart;

export type SettingsTarget = SettingsSection | 'cards' | 'holidays' | 'start';

/** MS-32 Sozlamalar (T-161, FR-SYS-1). */
export function SettingsMenuView(p: { onOpen: (x: SettingsTarget) => void }) {
  const [center, ...rest] = SETTINGS_SECTIONS;
  const item = (key: SettingsTarget, title: string, subtitle?: string) => (
    <ListItem key={key} title={title} subtitle={subtitle} chevron onClick={() => p.onOpen(key)} />
  );
  return (
    <Screen title={c.title}>
      <Section>{item('start', c.start, c.startHint)}</Section>
      <Section>
        {item(center, c.sections[center])}
        {item('cards', c.sections.cards)}
        {rest.map((x) => item(x, c.sections[x]))}
        {item('holidays', c.holidays)}
      </Section>
    </Screen>
  );
}

export interface SettingsSectionProps {
  section: SettingsSection;
  form: SettingsForm;
  onForm: (f: SettingsForm) => void;
  saving: boolean;
  onSave: () => void;
  logo: FilePickState;
  onPickLogo: () => void;
  /** Saqlangan logotip bor. */
  onOpenLogo?: () => void;
}

type TextKey = Exclude<keyof SettingsForm, 'penaltyOn' | 'perLesson'>;

function Input(
  p: Pick<SettingsSectionProps, 'form' | 'onForm'> & {
    k: TextKey;
    label: string;
    type?: 'text' | 'tel' | 'time';
    numeric?: boolean;
    hint?: string;
  },
) {
  return (
    <TextField
      label={p.label}
      type={p.type}
      inputMode={p.numeric ? 'numeric' : undefined}
      hint={p.hint}
      value={p.form[p.k]}
      onChange={(e) => p.onForm({ ...p.form, [p.k]: e.target.value })}
    />
  );
}

function CenterFields(p: SettingsSectionProps) {
  return (
    <Fields footer={c.centerHint}>
      <Input {...p} k="name" label={c.name} />
      <Input {...p} k="phone" label={c.phone} type="tel" />
      <Input {...p} k="address" label={c.address} />
      <FilePicker
        label={c.logo}
        state={p.logo}
        pickLabel={c.pickLogo}
        replaceLabel={c.replaceLogo}
        uploadingLabel={t.staffKit.uploading}
        onPick={p.onPickLogo}
      />
      {p.onOpenLogo && <InlineButton onClick={p.onOpenLogo}>{c.openLogo}</InlineButton>}
    </Fields>
  );
}

function PenaltyFields(p: SettingsSectionProps) {
  const { form, onForm } = p;
  return (
    <Fields footer={c.penaltyHint}>
      <Segmented
        label={c.penaltyOn}
        value={form.penaltyOn ? 'on' : 'off'}
        options={[
          { value: 'off', label: c.off },
          { value: 'on', label: c.on },
        ]}
        onChange={(v) => onForm({ ...form, penaltyOn: v === 'on' })}
      />
      <Input {...p} k="threshold" label={c.threshold} numeric />
      <MoneyInput
        label={c.perLesson}
        allowZero
        value={form.perLesson}
        onChange={(perLesson) => onForm({ ...form, perLesson })}
      />
      <Input {...p} k="late" label={c.late} numeric />
    </Fields>
  );
}

const FIELDS: Record<SettingsSection, (p: SettingsSectionProps) => ReactNode> = {
  center: CenterFields,
  penalty: PenaltyFields,
  billing: (p) => (
    <Fields>
      <Input {...p} k="dueDay" label={c.dueDay} hint={c.dueDayHint} numeric />
      <Input {...p} k="discount" label={c.discount} hint={c.discountHint} numeric />
    </Fields>
  ),
  times: (p) => (
    <Fields>
      <Input {...p} k="morning" label={c.morning} type="time" />
      <Input {...p} k="evening" label={c.evening} type="time" />
      <Input {...p} k="attendance" label={c.attendance} numeric />
      <Input {...p} k="absence" label={c.absence} hint={c.absenceHint} numeric />
    </Fields>
  ),
};

/** MS-32a Bo'lim: maydonlar → MainButton. */
export function SettingsSectionView(p: SettingsSectionProps) {
  useMainButton({
    text: c.save,
    // Logotip yuklanayotganda saqlansa — logotipsiz qolardi.
    disabled: sectionPatch(p.section, p.form) === null || p.logo.kind === 'uploading',
    loading: p.saving,
    onClick: p.onSave,
  });
  const Body = FIELDS[p.section];
  return (
    <Screen title={c.sections[p.section]}>
      <Body {...p} />
    </Screen>
  );
}

/** MS-32b Karta rekvizitlari. */
export function CardsView(p: {
  cards: readonly PaymentCard[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  useMainButton({ text: c.addCard, onClick: p.onAdd });
  return (
    <Screen title={c.sections.cards}>
      <Section footer={c.primaryHint}>
        {p.cards.length === 0 && <EmptyRow text={c.noCards} />}
        {p.cards.map((x) => (
          <ListItem
            key={x.id}
            title={cardText(x.cardNumber)}
            subtitle={`${x.holderName} · ${x.bankName}`}
            after={x.isPrimary ? <StatusChip tone="success">{c.primary}</StatusChip> : undefined}
            onClick={() => p.onOpen(x.id)}
          />
        ))}
      </Section>
    </Screen>
  );
}

export function CardView(p: {
  form: CardForm;
  /** Yangi karta — `null`. */
  saved: PaymentCard | null;
  saving: boolean;
  onForm: (f: CardForm) => void;
  onSave: () => void;
  onPrimary: () => void;
  onRemove: () => void;
}) {
  const [ask, setAsk] = useState(false);
  useMainButton({
    text: p.saved ? c.save : c.addCard,
    disabled: !cardValid(p.form),
    loading: p.saving,
    onClick: p.onSave,
  });
  const field = (k: keyof CardForm) => ({
    value: p.form[k],
    onChange: (e: ChangeEvent<HTMLInputElement>) => p.onForm({ ...p.form, [k]: e.target.value }),
  });
  return (
    <Screen title={c.cardTitle}>
      <Fields>
        <TextField
          label={c.cardNumber}
          inputMode="numeric"
          autoComplete="off"
          maxLength={24}
          {...field('cardNumber')}
        />
        <TextField label={c.holder} autoComplete="off" maxLength={100} {...field('holderName')} />
        <TextField label={c.bank} autoComplete="off" maxLength={100} {...field('bankName')} />
      </Fields>
      {p.saved && (
        <Section>
          {!p.saved.isPrimary && (
            <ListItem
              title={<span className="text-link">{c.makePrimary}</span>}
              disabled={p.saving}
              onClick={p.onPrimary}
            />
          )}
          <ListItem
            title={<span className="text-danger">{c.removeCard}</span>}
            disabled={p.saving}
            onClick={() => setAsk(true)}
          />
        </Section>
      )}
      <ConfirmSheet
        open={ask}
        danger
        title={c.removeCardTitle}
        action={c.removeCard}
        onClose={() => setAsk(false)}
        onConfirm={p.onRemove}
      />
    </Screen>
  );
}

/** MS-32c Boshlash ustasi (T-117): qadam holati haqiqiy ma'lumotdan, bosilsa — o'sha ekran. */
export function StartView(p: { state: StartState; onStep: (x: StartStep) => void }) {
  const { done, botUrl } = p.state;
  const n = START_STEPS.filter((x) => done[x]).length;
  const progress = s.progress.replace('{n}', String(n)).replace('{m}', String(START_STEPS.length));
  return (
    <Screen title={s.title} subtitle={progress}>
      <Section>
        {START_STEPS.map((x, i) => (
          <ListItem
            key={x}
            title={`${i + 1}. ${s.steps[x]}`}
            after={
              <StatusChip tone={done[x] ? 'success' : 'warning'}>
                {done[x] ? s.done : s.todo}
              </StatusChip>
            }
            chevron
            onClick={() => p.onStep(x)}
          />
        ))}
      </Section>
      <p className="px-2 text-sm text-text-muted">{s.inviteHint}</p>
      <CopyField
        value={botUrl}
        caption={s.invite}
        copyLabel={t.staffPeople.copy}
        copiedLabel={t.staffPeople.copied}
      />
    </Screen>
  );
}
