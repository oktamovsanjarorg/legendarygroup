import type { HolidayDto } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, Section, TextField, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import { Fields, Screen } from './form-kit.js';
import { ConfirmSheet, StepBar } from './kit.js';

const c = t.staffCalendar;

export interface HolidaysViewProps {
  year: number;
  today: string;
  items: readonly HolidayDto[];
  saving: boolean;
  onYear: (step: -1 | 1) => void;
  onAdd: (h: HolidayDto) => void;
  onDelete: (date: string) => void;
}

function AddHoliday(p: Pick<HolidaysViewProps, 'today' | 'saving' | 'onAdd'>) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  useMainButton({
    text: c.addHoliday,
    visible: date >= p.today && name.trim().length >= 2,
    loading: p.saving,
    onClick: () => {
      p.onAdd({ date, name: name.trim() });
      setDate('');
      setName('');
    },
  });
  return (
    <Fields title={c.addHoliday} footer={c.holidayHint}>
      <TextField
        label={c.date}
        type="date"
        min={p.today}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <TextField
        label={c.holidayName}
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </Fields>
  );
}

/** MS-22 Bayramlar: shu kuni dars yo'q (BR-3/BR-5); o'tgani o'zgarmaydi. */
export function HolidaysView(p: HolidaysViewProps) {
  const [removing, setRemoving] = useState<HolidayDto | null>(null);
  return (
    <Screen title={c.holidays}>
      <StepBar
        label={c.year.replace('{y}', String(p.year))}
        prevLabel={c.prevYear}
        nextLabel={c.nextYear}
        onStep={p.onYear}
      />
      {p.items.length === 0 ? (
        <EmptyState title={c.noHolidays} />
      ) : (
        <Section>
          {p.items.map((h) => {
            const open = h.date >= p.today;
            return (
              <ListItem
                key={h.date}
                title={h.name}
                subtitle={formatYmd(h.date)}
                after={
                  open ? <span className="text-danger">{t.staffGroups.remove}</span> : undefined
                }
                onClick={open ? () => setRemoving(h) : undefined}
              />
            );
          })}
        </Section>
      )}
      <AddHoliday today={p.today} saving={p.saving} onAdd={p.onAdd} />
      <ConfirmSheet
        open={removing !== null}
        title={c.deleteHoliday}
        action={c.deleteHoliday}
        danger
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && p.onDelete(removing.date)}
      >
        {c.deleteHolidayAsk.replace('{name}', removing?.name ?? '')}
      </ConfirmSheet>
    </Screen>
  );
}
