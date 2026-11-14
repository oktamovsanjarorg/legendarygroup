import { webMessages as t } from '@lg/i18n';
import { Button, Card, Field, PageHeader, Tabs } from '@lg/ui-web';

export type SettingsSection = keyof typeof t.settings.sections;

export interface CenterSettings {
  name: string;
  phone: string;
  address: string;
  card: string;
  cardHolder: string;
  dueDay: number;
  adminDiscountLimit: number;
  lateThreshold: number;
  reminderAfter: number;
}

function SectionFields({ section, s }: { section: SettingsSection; s: CenterSettings }) {
  switch (section) {
    case 'center':
      return (
        <>
          <Field label={t.settings.centerName} defaultValue={s.name} />
          <Field label={t.settings.phone} type="tel" defaultValue={s.phone} />
          <Field label={t.settings.address} defaultValue={s.address} />
        </>
      );
    case 'billing':
      return (
        <>
          <Field label={t.settings.card} inputMode="numeric" defaultValue={s.card} />
          <Field label={t.settings.cardHolder} defaultValue={s.cardHolder} />
          <Field label={t.settings.dueDay} type="number" min={1} max={28} defaultValue={s.dueDay} />
          <Field
            label={t.settings.adminDiscountLimit}
            type="number"
            min={0}
            max={100}
            defaultValue={s.adminDiscountLimit}
          />
        </>
      );
    case 'attendance':
      return (
        <>
          <Field label={t.settings.lateThreshold} type="number" defaultValue={s.lateThreshold} />
          <Field label={t.settings.reminderAfter} type="number" defaultValue={s.reminderAfter} />
        </>
      );
    case 'holidays':
      return <p className="text-sm text-text-muted">—</p>;
  }
}

interface Props {
  section: SettingsSection;
  s: CenterSettings;
  onSection: (x: SettingsSection) => void;
}

/** W-29 Sozlamalar (FR-SYS-1). */
export function SettingsView({ section, s, onSection }: Props) {
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
        <SectionFields section={section} s={s} />
        <div className="flex justify-end">
          <Button>{t.common.save}</Button>
        </div>
      </Card>
    </>
  );
}
