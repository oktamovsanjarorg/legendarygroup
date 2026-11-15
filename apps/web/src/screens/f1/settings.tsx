import { webMessages as t } from '@lg/i18n';
import { Button, Card, Field, PageHeader, Tabs } from '@lg/ui-web';
import type { ReactNode } from 'react';

export type SettingsSection = keyof typeof t.settings.sections;

export interface CenterSettings {
  name: string;
  phone: string;
  address: string;
  card: string;
  cardHolder: string;
  bankName: string;
  dueDay: number;
  adminDiscountLimit: number;
  lateThreshold: number;
  reminderAfter: number;
}

type Patch = (p: Partial<CenterSettings>) => void;
const num = (v: string) => (v === '' ? 0 : Number(v));

function BillingFields({ s, on }: { s: CenterSettings; on: Patch }) {
  return (
    <>
      <Field
        label={t.settings.card}
        inputMode="numeric"
        value={s.card}
        onChange={(e) => on({ card: e.target.value })}
      />
      <Field
        label={t.settings.cardHolder}
        value={s.cardHolder}
        onChange={(e) => on({ cardHolder: e.target.value })}
      />
      <Field
        label={t.settings.bankName}
        value={s.bankName}
        onChange={(e) => on({ bankName: e.target.value })}
      />
      <Field
        label={t.settings.dueDay}
        type="number"
        min={1}
        max={28}
        value={s.dueDay}
        onChange={(e) => on({ dueDay: num(e.target.value) })}
      />
      <Field
        label={t.settings.adminDiscountLimit}
        type="number"
        min={0}
        max={100}
        value={s.adminDiscountLimit}
        onChange={(e) => on({ adminDiscountLimit: num(e.target.value) })}
      />
    </>
  );
}

function SectionFields({
  section,
  s,
  on,
}: {
  section: SettingsSection;
  s: CenterSettings;
  on: Patch;
}) {
  switch (section) {
    case 'center':
      return (
        <>
          <Field
            label={t.settings.centerName}
            value={s.name}
            onChange={(e) => on({ name: e.target.value })}
          />
          <Field
            label={t.settings.phone}
            type="tel"
            value={s.phone}
            onChange={(e) => on({ phone: e.target.value })}
          />
          <Field
            label={t.settings.address}
            value={s.address}
            onChange={(e) => on({ address: e.target.value })}
          />
        </>
      );
    case 'billing':
      return <BillingFields s={s} on={on} />;
    case 'attendance':
      return (
        <>
          <Field
            label={t.settings.lateThreshold}
            type="number"
            value={s.lateThreshold}
            onChange={(e) => on({ lateThreshold: num(e.target.value) })}
          />
          <Field
            label={t.settings.reminderAfter}
            type="number"
            value={s.reminderAfter}
            onChange={(e) => on({ reminderAfter: num(e.target.value) })}
          />
        </>
      );
    case 'holidays':
      return null;
  }
}

interface Props {
  section: SettingsSection;
  s: CenterSettings;
  onSection: (x: SettingsSection) => void;
  onChange?: Patch;
  onSave?: () => void;
  saving?: boolean;
  /** Saqlash natijasi/xatosi matni. */
  message?: { text: string; error: boolean };
  /** "Bayramlar" bo'limi tarkibi (ro'yxat + qo'shish). */
  holidays?: ReactNode;
}

/** W-29 Sozlamalar (FR-SYS-1). */
export function SettingsView({
  section,
  s,
  onSection,
  onChange,
  onSave,
  saving,
  message,
  holidays,
}: Props) {
  return (
    <>
      <PageHeader title={t.settings.title} />
      <Tabs
        label={t.settings.title}
        value={section}
        onChange={onSection}
        items={(Object.keys(t.settings.sections) as SettingsSection[]).map((k) => ({
          value: k,
          label: t.settings.sections[k],
        }))}
      />
      <Card className="flex max-w-xl flex-col gap-4">
        {section === 'holidays' ? (
          holidays
        ) : (
          <>
            <SectionFields section={section} s={s} on={onChange ?? (() => undefined)} />
            {message && (
              <p
                role={message.error ? 'alert' : 'status'}
                className={message.error ? 'text-sm text-danger' : 'text-sm text-success'}
              >
                {message.text}
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={onSave} loading={saving}>
                {t.common.save}
              </Button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
