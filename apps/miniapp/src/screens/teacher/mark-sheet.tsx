import { miniappMessages as t } from '@lg/i18n';
import { ActionSheet, type AttendanceMark } from '@lg/ui-tg';
import { CheckCircle2, FileText, XCircle } from 'lucide-react';
import { LATE_CHOICES } from './attendance-marks.js';

interface Props {
  name: string | null;
  onPick: (mark: AttendanceMark) => void;
  onClose: () => void;
}

/** Uzoq bosish menyusi (MT-02): kech qoldi (daqiqa — klaviaturasiz), sababli, keldi/kelmadi. */
export function MarkSheet({ name, onPick, onClose }: Props) {
  return (
    <ActionSheet
      open={name !== null}
      title={name ?? undefined}
      cancelLabel={t.attendance.cancel}
      onClose={onClose}
      actions={[
        {
          label: t.attendance.excused,
          icon: <FileText className="size-5" aria-hidden />,
          onSelect: () => onPick({ kind: 'excused' }),
        },
        {
          label: t.attendance.setAbsent,
          icon: <XCircle className="size-5" aria-hidden />,
          onSelect: () => onPick({ kind: 'absent' }),
        },
        {
          label: t.attendance.setPresent,
          icon: <CheckCircle2 className="size-5" aria-hidden />,
          onSelect: () => onPick({ kind: 'present' }),
        },
      ]}
    >
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
        <p className="text-sm text-text-muted">{t.attendance.lateMinutesPrompt}</p>
        <div className="grid grid-cols-6 gap-2">
          {LATE_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPick({ kind: 'late', minutes: n })}
              className="min-h-11 rounded-lg bg-warning-bg text-base font-semibold tabular-nums text-warning active:opacity-70"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </ActionSheet>
  );
}
