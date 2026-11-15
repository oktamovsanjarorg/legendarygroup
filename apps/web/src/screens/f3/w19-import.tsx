import { webMessages as t } from '@lg/i18n';
import { Badge, Button, Card } from '@lg/ui-web';
import type { ImportRow } from './types.js';

const im = t.tests.import;
const TONE = { matched: 'success', suggested: 'warning', unmatched: 'danger' } as const;

interface Props {
  rows: readonly ImportRow[];
  /** Qabul qilingan taklif qatorlari kaliti. */
  accepted: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  saving?: boolean;
}

/** BR-35: mos kelganlar saqlanadi; taklif — faqat qabul qilinsa; topilmagan — o'tkazib yuboriladi. */
export function ImportPreview({ rows, accepted, onToggle, onConfirm, onCancel, saving }: Props) {
  const count = rows.filter((r) => r.kind === 'matched' || accepted.has(r.key)).length;
  return (
    <Card className="mt-4 flex flex-col gap-3 p-4">
      <h3 className="font-semibold text-text">{im.title}</h3>
      <ul className="flex flex-col divide-y divide-border text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 py-2">
            <div className="flex flex-col">
              <span className="text-text">
                #{r.rowNumber} · {r.studentName ?? r.raw}
                {r.score !== null && <span className="ml-2 font-semibold">{r.score}</span>}
              </span>
              {(r.kind !== 'matched' || r.note) && (
                <span className="text-xs text-text-muted">
                  {r.raw}
                  {r.note ? ` · ${r.note}` : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={TONE[r.kind]}>{im[r.kind]}</Badge>
              {r.kind === 'suggested' && (
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={accepted.has(r.key)}
                    onChange={() => onToggle(r.key)}
                  />
                  {im.accept}
                </label>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button onClick={onConfirm} loading={saving} disabled={count === 0}>
          {im.confirm.replace('{n}', String(count))}
        </Button>
      </div>
    </Card>
  );
}
