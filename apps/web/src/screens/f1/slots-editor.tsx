import { webMessages as t } from '@lg/i18n';
import { Button, cn, Field } from '@lg/ui-web';
import { Plus, Trash2 } from 'lucide-react';

/** Bir xil vaqtdagi kunlar bloki: `Du/Ch/Ju 15:00–16:30`. Kunlar: 1 — dushanba … 7 — yakshanba. */
export interface SlotBlock {
  days: readonly number[];
  start: string;
  end: string;
}

export const EMPTY_BLOCK: SlotBlock = { days: [], start: '15:00', end: '16:30' };
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

interface BlockProps {
  block: SlotBlock;
  disabled?: boolean;
  onChange: (b: SlotBlock) => void;
  onRemove?: () => void;
}

function Block({ block, disabled, onChange, onRemove }: BlockProps) {
  const toggle = (day: number) =>
    onChange({
      ...block,
      days: block.days.includes(day)
        ? block.days.filter((d) => d !== day)
        : [...block.days, day].sort((a, b) => a - b),
    });
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div role="group" aria-label={t.groups.form.days} className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((day) => {
          const on = block.days.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              aria-label={t.calendar.days[day - 1]}
              disabled={disabled}
              onClick={() => toggle(day)}
              className={cn(
                'min-h-9 min-w-10 rounded-md border px-2 text-sm font-medium',
                on
                  ? 'border-primary bg-primary text-primary-text'
                  : 'border-border bg-bg text-text hover:bg-surface',
              )}
            >
              {t.calendar.daysShort[day - 1]}
            </button>
          );
        })}
      </div>
      <div className="flex items-end gap-3">
        <Field
          label={t.groups.form.start}
          type="time"
          disabled={disabled}
          value={block.start}
          onChange={(e) => onChange({ ...block, start: e.target.value })}
        />
        <Field
          label={t.groups.form.end}
          type="time"
          disabled={disabled}
          value={block.end}
          onChange={(e) => onChange({ ...block, end: e.target.value })}
        />
        {onRemove && (
          <Button variant="ghost" aria-label={t.groups.form.removeTime} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

interface Props {
  blocks: readonly SlotBlock[];
  error?: string | null;
  disabled?: boolean;
  onChange: (blocks: SlotBlock[]) => void;
}

/** Haftalik jadval tahriri (FR-ORG-4): kunlar + vaqt; turli vaqtlar uchun — bir nechta blok. */
export function SlotsEditor({ blocks, error, disabled, onChange }: Props) {
  const replace = (i: number, b: SlotBlock) => onChange(blocks.map((x, k) => (k === i ? b : x)));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text">{t.groups.form.time}</span>
      {blocks.map((b, i) => (
        <Block
          key={i}
          block={b}
          disabled={disabled}
          onChange={(nb) => replace(i, nb)}
          onRemove={
            blocks.length > 1 ? () => onChange(blocks.filter((_, k) => k !== i)) : undefined
          }
        />
      ))}
      {!disabled && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => onChange([...blocks, EMPTY_BLOCK])}
        >
          <Plus className="size-4" aria-hidden />
          {t.groups.form.addTime}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
